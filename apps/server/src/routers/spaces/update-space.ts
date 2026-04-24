import { Permission } from '@opencord/shared';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { publishSpacesSync } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { spaceRoles, spaceUsers, spaces, users } from '../../db/schema';
import { fileManager } from '../../utils/file-manager';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const updateSpaceRoute = protectedProcedure
  .input(
    z.object({
      spaceId: z.number().min(1),
      name: z.string().min(1).max(32),
      avatarFileId: z.string().optional(),
      roleIds: z.array(z.number()).default([]),
      userIds: z.array(z.number()).default([])
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_SPACES);

    const uniqueUserIds = [...new Set(input.userIds)];

    if (uniqueUserIds.length > 0) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, uniqueUserIds))
        .all();

      invariant(rows.length === uniqueUserIds.length, {
        code: 'BAD_REQUEST',
        message: 'One or more selected users were not found.'
      });
    }

    const existingSpace = await db
      .select()
      .from(spaces)
      .where(eq(spaces.id, input.spaceId))
      .get();

    invariant(existingSpace, {
      code: 'NOT_FOUND',
      message: 'Space not found.'
    });

    const now = Date.now();
    let nextAvatarId = existingSpace.avatarId ?? null;

    if (input.avatarFileId) {
      const tempFile = await fileManager.getTemporaryFile(input.avatarFileId);

      invariant(tempFile, {
        code: 'NOT_FOUND',
        message: 'Temporary file not found'
      });

      const settings = await getSettings();

      invariant(tempFile.size <= settings.storageMaxAvatarSize, {
        code: 'BAD_REQUEST',
        message: `Avatar file exceeds the configured maximum size of ${settings.storageMaxAvatarSize / (1024 * 1024)} MB`
      });

      if (existingSpace.avatarId) {
        await removeFile(existingSpace.avatarId);
      }

      const savedFile = await fileManager.saveFile(input.avatarFileId, ctx.userId);
      nextAvatarId = savedFile.id;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(spaces)
        .set({
          name: input.name,
          avatarId: nextAvatarId,
          updatedAt: now
        })
        .where(eq(spaces.id, input.spaceId));

      await tx.delete(spaceRoles).where(eq(spaceRoles.spaceId, input.spaceId));
      await tx.delete(spaceUsers).where(eq(spaceUsers.spaceId, input.spaceId));

      for (const roleId of [...new Set(input.roleIds)]) {
        await tx.insert(spaceRoles).values({
          spaceId: input.spaceId,
          roleId,
          createdAt: now
        });
      }

      for (const userId of uniqueUserIds) {
        await tx.insert(spaceUsers).values({
          spaceId: input.spaceId,
          userId,
          createdAt: now
        });
      }
    });

    await publishSpacesSync();
  });

export { updateSpaceRoute };
