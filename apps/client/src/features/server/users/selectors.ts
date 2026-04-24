import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import {
  canUserSeeTarget,
  DELETED_USER_IDENTITY_AND_NAME,
  type TMuteSettings,
  UserStatus
} from '@opencord/shared';
import { createCachedSelector } from 're-reselect';

const STATUS_ORDER: Record<string, number> = {
  online: 0,
  idle: 1,
  offline: 2
};

export const ownUserIdSelector = (state: IRootState) => state.server.ownUserId;
const rawUsersSelector = (state: IRootState) => state.server.users;

export const visibleUsersSelector = createSelector(
  [rawUsersSelector, ownUserIdSelector],
  (users, ownUserId) => {
    const ownUser = users.find((user) => user.id === ownUserId);

    if (!ownUser) {
      return users;
    }

    return users.filter((user) => canUserSeeTarget(ownUser, user));
  }
);

export const usersSelector = createSelector(
  visibleUsersSelector,
  (users) => {
    return [...users].sort((a, b) => {
      const aBanned = Boolean(a.banned);
      const bBanned = Boolean(b.banned);

      if (aBanned !== bBanned) {
        return aBanned ? 1 : -1;
      }

      const aStatus = STATUS_ORDER[String(a.status ?? UserStatus.OFFLINE)] ?? 3;
      const bStatus = STATUS_ORDER[String(b.status ?? UserStatus.OFFLINE)] ?? 3;

      if (aStatus !== bStatus) {
        return aStatus - bStatus;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }
);

// returns all users except the own user and deleted users
export const filteredUsersSelector = createSelector(
  [usersSelector, ownUserIdSelector],
  (users, ownUserId) =>
    users.filter(
      (user) =>
        user.name !== DELETED_USER_IDENTITY_AND_NAME && user.id !== ownUserId
    )
);

// returns all mentionable users including own user, excluding only deleted placeholders
export const mentionableUsersSelector = createSelector([usersSelector], (users) =>
  users.filter((user) => user.name !== DELETED_USER_IDENTITY_AND_NAME)
);

export const ownUserSelector = createSelector(
  [ownUserIdSelector, rawUsersSelector],
  (ownUserId, users) => users.find((user) => user.id === ownUserId)
);

export const muteSettingsSelector = (state: IRootState): TMuteSettings =>
  state.server.muteSettings;

export const mutedSpaceIdsSelector = createSelector(
  [muteSettingsSelector],
  (muteSettings) => muteSettings.mutedSpaceIds
);

export const mutedChannelIdsSelector = createSelector(
  [muteSettingsSelector],
  (muteSettings) => muteSettings.mutedChannelIds
);

export const mutedDmUserIdsSelector = createSelector(
  [muteSettingsSelector],
  (muteSettings) => muteSettings.mutedDmUserIds
);

export const isSpaceMutedSelector = createCachedSelector(
  [mutedSpaceIdsSelector, (_: IRootState, spaceId: number) => spaceId],
  (mutedSpaceIds, spaceId) => mutedSpaceIds.includes(spaceId)
)((_, spaceId: number) => spaceId);

export const isChannelMutedSelector = createCachedSelector(
  [mutedChannelIdsSelector, (_: IRootState, channelId: number) => channelId],
  (mutedChannelIds, channelId) => mutedChannelIds.includes(channelId)
)((_, channelId: number) => channelId);

export const isDmUserMutedSelector = createCachedSelector(
  [mutedDmUserIdsSelector, (_: IRootState, userId: number) => userId],
  (mutedDmUserIds, userId) => mutedDmUserIds.includes(userId)
)((_, userId: number) => userId);

export const userByIdSelector = createCachedSelector(
  [rawUsersSelector, (_: IRootState, userId: number) => userId],
  (users, userId) => users.find((user) => user.id === userId)
)((_, userId: number) => userId);

export const isOwnUserSelector = createCachedSelector(
  [ownUserIdSelector, (_: IRootState, userId: number) => userId],
  (ownUserId, userId) => ownUserId === userId
)((_, userId: number) => userId);

export const ownPublicUserSelector = createSelector(
  [ownUserIdSelector, rawUsersSelector],
  (ownUserId, users) => users.find((user) => user.id === ownUserId)
);

export const userStatusSelector = createSelector(
  [userByIdSelector],
  (user) => user?.status ?? UserStatus.OFFLINE
);

export const usernamesSelector = createSelector([usersSelector], (users) => {
  const map: Record<number, string> = {};

  users.forEach((user) => {
    map[user.id] = user.name;
  });

  return map;
});

