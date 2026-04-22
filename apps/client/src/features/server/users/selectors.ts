import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import { DELETED_USER_IDENTITY_AND_NAME, UserStatus } from '@opencord/shared';
import { createCachedSelector } from 're-reselect';

const STATUS_ORDER: Record<string, number> = {
  online: 0,
  idle: 1,
  offline: 2
};

const hasSharedRole = (firstRoleIds: number[] = [], secondRoleIds: number[] = []) => {
  if (firstRoleIds.length === 0 || secondRoleIds.length === 0) {
    return false;
  }

  const firstSet = new Set(firstRoleIds);
  return secondRoleIds.some((roleId) => firstSet.has(roleId));
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

    return users.filter(
      (user) => user.id === ownUserId || hasSharedRole(ownUser.roleIds, user.roleIds)
    );
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

