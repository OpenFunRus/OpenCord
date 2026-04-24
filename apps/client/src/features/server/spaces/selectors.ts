import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import { createCachedSelector } from 're-reselect';
import {
  allChannelsSelector,
  channelsReadStatesSelector,
  channelPermissionsSelector
} from '../channels/selectors';
import { isOwnUserOwnerSelector } from '../selectors';

export const spacesSelector = createSelector(
  [(state: IRootState) => state.server.spaces],
  (spaces) => [...spaces].sort((a, b) => a.position - b.position || a.id - b.id)
);

export const selectedSpaceIdSelector = (state: IRootState) =>
  state.server.selectedSpaceId;

export const selectedSpaceSelector = createSelector(
  [spacesSelector, selectedSpaceIdSelector],
  (spaces, selectedSpaceId) =>
    spaces.find((space) => space.id === selectedSpaceId)
);

export const spaceByIdSelector = createCachedSelector(
  [spacesSelector, (_: IRootState, spaceId: number) => spaceId],
  (spaces, spaceId) => spaces.find((space) => space.id === spaceId)
)((_, spaceId: number) => spaceId);

export const spaceUnreadCountSelector = createCachedSelector(
  [
    allChannelsSelector,
    channelsReadStatesSelector,
    channelPermissionsSelector,
    isOwnUserOwnerSelector,
    (_: IRootState, spaceId: number) => spaceId
  ],
  (channels, readStates, channelPermissions, isOwner, spaceId) =>
    channels
      .filter((channel) => {
        if (channel.isDm || channel.spaceId !== spaceId) {
          return false;
        }

        if (isOwner || !channel.private) {
          return true;
        }

        return (
          channelPermissions[channel.id]?.permissions?.VIEW_CHANNEL === true
        );
      })
      .reduce((acc, channel) => acc + (readStates[channel.id] ?? 0), 0)
)((_, spaceId: number) => spaceId);
