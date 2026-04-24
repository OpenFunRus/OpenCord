export type TSpaceAccessRule = {
  roleIds: readonly number[];
  userIds: readonly number[];
};

/** When both lists are empty, every server member can see the space. */
export const isSpaceVisibilityUnrestricted = (space: TSpaceAccessRule): boolean =>
  space.roleIds.length === 0 && space.userIds.length === 0;

export const canUserAccessSpace = (
  userId: number,
  memberRoleIds: readonly number[],
  space: TSpaceAccessRule
): boolean => {
  if (isSpaceVisibilityUnrestricted(space)) {
    return true;
  }

  if (space.userIds.includes(userId)) {
    return true;
  }

  return space.roleIds.some((roleId) => memberRoleIds.includes(roleId));
};
