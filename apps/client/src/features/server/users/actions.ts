import { store } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import { UserStatus, type TJoinedPublicUser, type TMuteSettings } from '@opencord/shared';
import { serverSliceActions } from '../slice';
import { muteSettingsSelector, userByIdSelector } from './selectors';

export const setUsers = (users: TJoinedPublicUser[]) => {
  store.dispatch(serverSliceActions.setUsers(users));
};

export const addUser = (user: TJoinedPublicUser) => {
  store.dispatch(serverSliceActions.addUser(user));
};

export const setMuteSettings = (muteSettings: TMuteSettings) => {
  store.dispatch(serverSliceActions.setMuteSettings(muteSettings));
};

export const updateUser = (
  userId: number,
  user: Partial<TJoinedPublicUser>
) => {
  store.dispatch(serverSliceActions.updateUser({ userId, user }));
};

export const wipeUser = (userId: number) => {
  store.dispatch(serverSliceActions.wipeUser({ userId }));
};

export const reassignUser = (userId: number, targetUser: number) => {
  store.dispatch(
    serverSliceActions.reassignUser({ userId, deletedUserId: targetUser })
  );
};

export const handleUserJoin = (user: TJoinedPublicUser) => {
  const state = store.getState();
  const foundUser = userByIdSelector(state, user.id);

  if (foundUser) {
    updateUser(user.id, { ...user, status: UserStatus.ONLINE });
  } else {
    addUser(user);
  }
};

const normalizeIds = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b);

export const saveMuteSettings = async (muteSettings: TMuteSettings) => {
  const previous = muteSettingsSelector(store.getState());
  const normalized: TMuteSettings = {
    mutedSpaceIds: normalizeIds(muteSettings.mutedSpaceIds),
    mutedChannelIds: normalizeIds(muteSettings.mutedChannelIds),
    mutedDmUserIds: normalizeIds(muteSettings.mutedDmUserIds)
  };

  setMuteSettings(normalized);

  try {
    const trpc = getTRPCClient();
    await trpc.users.updateMuteSettings.mutate(normalized);
  } catch (error) {
    setMuteSettings(previous);
    throw error;
  }
};

const toggleId = (ids: number[], id: number) =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

export const toggleSpaceMute = async (spaceId: number) => {
  const current = muteSettingsSelector(store.getState());
  await saveMuteSettings({
    ...current,
    mutedSpaceIds: toggleId(current.mutedSpaceIds, spaceId)
  });
};

export const toggleChannelMute = async (channelId: number) => {
  const current = muteSettingsSelector(store.getState());
  await saveMuteSettings({
    ...current,
    mutedChannelIds: toggleId(current.mutedChannelIds, channelId)
  });
};

export const toggleDmUserMute = async (userId: number) => {
  const current = muteSettingsSelector(store.getState());
  await saveMuteSettings({
    ...current,
    mutedDmUserIds: toggleId(current.mutedDmUserIds, userId)
  });
};

