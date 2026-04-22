import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import { createCachedSelector } from 're-reselect';

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
