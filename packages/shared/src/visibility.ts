type TUserVisibility = {
  id: number;
  roleIds: number[];
  canSeeUsersFromOwnRoles: boolean;
  visibleUserIds: number[];
  visibleRoleIds: number[];
};

const hasSharedRole = (firstRoleIds: number[] = [], secondRoleIds: number[] = []) => {
  if (firstRoleIds.length === 0 || secondRoleIds.length === 0) {
    return false;
  }

  const firstSet = new Set(firstRoleIds);
  return secondRoleIds.some((roleId) => firstSet.has(roleId));
};

const hasExplicitVisibilityMatch = (
  viewer: TUserVisibility,
  target: Pick<TUserVisibility, 'id' | 'roleIds'>
) => {
  if (viewer.visibleUserIds.includes(target.id)) {
    return true;
  }

  if (viewer.visibleRoleIds.length === 0 || target.roleIds.length === 0) {
    return false;
  }

  const visibleRoleSet = new Set(viewer.visibleRoleIds);
  return target.roleIds.some((roleId) => visibleRoleSet.has(roleId));
};

const canUserSeeTarget = (
  viewer: TUserVisibility,
  target: Pick<TUserVisibility, 'id' | 'roleIds'>
) => {
  if (viewer.id === target.id) {
    return true;
  }

  if (
    viewer.canSeeUsersFromOwnRoles &&
    hasSharedRole(viewer.roleIds, target.roleIds)
  ) {
    return true;
  }

  return hasExplicitVisibilityMatch(viewer, target);
};

const canUserDirectMessageTarget = canUserSeeTarget;

export {
  canUserDirectMessageTarget,
  canUserSeeTarget,
  hasExplicitVisibilityMatch,
  hasSharedRole
};
