import { setDmsOpen } from '@/features/app/actions';
import { store } from '@/features/store';
import type {
  TCategory,
  TChannel,
  TChannelUserPermissionsMap,
  TJoinedSpace,
  TReadStateMap
} from '@opencord/shared';
import { serverSliceActions } from '../slice';
import { setSelectedChannelId } from '../channels/actions';
import { channelByIdSelector, selectedChannelIdSelector } from '../channels/selectors';
import { selectedSpaceIdSelector } from './selectors';

export const setSpaces = (spaces: TJoinedSpace[]) => {
  store.dispatch(serverSliceActions.setSpaces(spaces));
};

export const setSelectedSpaceId = (spaceId: number | undefined) => {
  store.dispatch(serverSliceActions.setSelectedSpaceId(spaceId));

  const state = store.getState();
  const selectedChannelId = selectedChannelIdSelector(state);

  if (!selectedChannelId) {
    return;
  }

  const selectedChannel = channelByIdSelector(state, selectedChannelId);

  if (!selectedChannel?.isDm && selectedChannel?.spaceId !== spaceId) {
    setSelectedChannelId(undefined);
  }
};

export const selectSpace = (spaceId: number) => {
  setDmsOpen(false);
  setSelectedSpaceId(spaceId);
};

export const applySpacesSync = (payload: {
  spaces: TJoinedSpace[];
  categories: TCategory[];
  channels: TChannel[];
  channelPermissions: TChannelUserPermissionsMap;
  readStates: TReadStateMap;
}) => {
  store.dispatch(serverSliceActions.setSpaces(payload.spaces));
  store.dispatch(serverSliceActions.setCategories(payload.categories));
  store.dispatch(serverSliceActions.setChannels(payload.channels));
  store.dispatch(serverSliceActions.setChannelPermissions(payload.channelPermissions));
  store.dispatch(serverSliceActions.setAllReadStates(payload.readStates));

  const state = store.getState();
  const selectedSpaceId = selectedSpaceIdSelector(state);
  const selectedChannelId = selectedChannelIdSelector(state);

  if (!selectedChannelId) {
    return;
  }

  const selectedChannel = channelByIdSelector(state, selectedChannelId);

  if (!selectedChannel?.isDm && selectedChannel?.spaceId !== selectedSpaceId) {
    setSelectedChannelId(undefined);
  }
};
