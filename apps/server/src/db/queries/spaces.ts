import type {
  TCategory,
  TChannel,
  TChannelUserPermissionsMap,
  TFile,
  TJoinedSpace,
  TReadStateMap
} from '@opencord/shared';
import { OWNER_ROLE_ID } from '@opencord/shared';
import { eq, inArray } from 'drizzle-orm';
import { db } from '..';
import { categories, files, spaceRoles, spaces, userRoles } from '../schema';
import {
  getAllChannelUserPermissions,
  getChannelsForUser,
  getChannelsReadStatesForUser
} from './channels';
import { getUserRoleIds } from './roles';

const getSpaces = async (): Promise<TJoinedSpace[]> => {
  const spaceRows = await db
    .select({
      id: spaces.id,
      name: spaces.name,
      avatarId: spaces.avatarId,
      position: spaces.position,
      isDefault: spaces.isDefault,
      createdAt: spaces.createdAt,
      updatedAt: spaces.updatedAt
    })
    .from(spaces)
    .all();

  const avatarIds = spaceRows
    .map((space) => space.avatarId)
    .filter((avatarId): avatarId is number => typeof avatarId === 'number');

  const avatarFiles =
    avatarIds.length > 0
      ? await db.select().from(files).where(inArray(files.id, avatarIds)).all()
      : [];
  const avatarMap = new Map<number, TFile>(avatarFiles.map((file) => [file.id, file]));

  const roleRows = await db
    .select({
      spaceId: spaceRoles.spaceId,
      roleId: spaceRoles.roleId
    })
    .from(spaceRoles)
    .all();

  const roleIdsBySpace = roleRows.reduce(
    (acc, { spaceId, roleId }) => {
      if (!acc[spaceId]) acc[spaceId] = [];
      acc[spaceId]!.push(roleId);
      return acc;
    },
    {} as Record<number, number[]>
  );

  return spaceRows.map((space) => ({
    ...space,
    avatar: space.avatarId ? avatarMap.get(space.avatarId) ?? null : null,
    roleIds: roleIdsBySpace[space.id] ?? []
  }));
};

const getVisibleSpacesForUser = async (userId: number): Promise<TJoinedSpace[]> => {
  const userRoleIds = await getUserRoleIds(userId);
  const allSpaces = await getSpaces();

  if (userRoleIds.includes(OWNER_ROLE_ID)) {
    return allSpaces.sort((a, b) => a.position - b.position || a.id - b.id);
  }

  return allSpaces
    .filter((space) => {
      if (space.roleIds.length === 0) {
        return true;
      }

      return space.roleIds.some((roleId) => userRoleIds.includes(roleId));
    })
    .sort((a, b) => a.position - b.position || a.id - b.id);
};

const getVisibleSpaceIdsForUser = async (userId: number): Promise<number[]> => {
  const visibleSpaces = await getVisibleSpacesForUser(userId);
  return visibleSpaces.map((space) => space.id);
};

const getAffectedUserIdsForSpace = async (spaceId: number): Promise<number[]> => {
  const linkedRoles = await db
    .select({ roleId: spaceRoles.roleId })
    .from(spaceRoles)
    .where(eq(spaceRoles.spaceId, spaceId));

  const ownerRows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, OWNER_ROLE_ID));

  const affectedUserIds = new Set(ownerRows.map((row) => row.userId));

  if (linkedRoles.length === 0) {
    const allUserRows = await db.select({ userId: userRoles.userId }).from(userRoles).all();

    allUserRows.forEach((row) => affectedUserIds.add(row.userId));
    return Array.from(affectedUserIds);
  }

  const roleIds = linkedRoles.map((row) => row.roleId);
  const matchingRoleRows = await db
    .select({ userId: userRoles.userId, roleId: userRoles.roleId })
    .from(userRoles)
    .where(inArray(userRoles.roleId, roleIds));

  matchingRoleRows.forEach((row) => {
    if (roleIds.includes(row.roleId)) {
      affectedUserIds.add(row.userId);
    }
  });

  return Array.from(affectedUserIds);
};

const getVisibleCategoriesForUser = async (userId: number): Promise<TCategory[]> => {
  const visibleSpaceIds = await getVisibleSpaceIdsForUser(userId);

  if (visibleSpaceIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(categories)
    .where(inArray(categories.spaceId, visibleSpaceIds))
    .all();
};

const getVisibleServerStructureForUser = async (
  userId: number
): Promise<{
  spaces: TJoinedSpace[];
  categories: TCategory[];
  channels: TChannel[];
  channelPermissions: TChannelUserPermissionsMap;
  readStates: TReadStateMap;
}> => {
  const visibleSpaces = await getVisibleSpacesForUser(userId);
  const [visibleCategories, channels, channelPermissions, readStates] = await Promise.all([
    getVisibleCategoriesForUser(userId),
    getChannelsForUser(userId),
    getAllChannelUserPermissions(userId),
    getChannelsReadStatesForUser(userId)
  ]);

  return {
    spaces: visibleSpaces,
    categories: visibleCategories,
    channels,
    channelPermissions,
    readStates
  };
};

export {
  getAffectedUserIdsForSpace,
  getSpaces,
  getVisibleServerStructureForUser,
  getVisibleSpaceIdsForUser,
  getVisibleSpacesForUser
};
