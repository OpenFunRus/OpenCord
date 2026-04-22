import { Permission } from '@opencord/shared';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getSettings } from '../../db/queries/server';
import { db } from '../../db';
import { publishSpacesSync } from '../../db/publishers';
import { categories, spaceRoles, spaces } from '../../db/schema';
import { fileManager } from '../../utils/file-manager';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const DEFAULT_SPACE_CATEGORIES = ['Текстовые каналы', 'Голосовые каналы'] as const;

const addSpaceRoute = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(32),
      avatarFileId: z.string().optional(),
      roleIds: z.array(z.number()).default([])
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_SPACES);

    const [result] = await db
      .select({ maxPos: sql<number>`COALESCE(MAX(${spaces.position}), 0)` })
      .from(spaces);

    const now = Date.now();
    let avatarId: number | undefined;

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

      const savedFile = await fileManager.saveFile(input.avatarFileId, ctx.userId);
      avatarId = savedFile.id;
    }

    const created = await db.transaction(async (tx) => {
      const space = await tx
        .insert(spaces)
        .values({
          name: input.name,
          avatarId,
          position: (result?.maxPos ?? 0) + 1,
          isDefault: false,
          createdAt: now
        })
        .returning()
        .get();

      for (const roleId of [...new Set(input.roleIds)]) {
        await tx.insert(spaceRoles).values({
          spaceId: space.id,
          roleId,
          createdAt: now
        });
      }

      await tx.insert(categories).values(
        DEFAULT_SPACE_CATEGORIES.map((name, index) => ({
          name,
          position: index + 1,
          spaceId: space.id,
          createdAt: now
        }))
      );

      return space;
    });

    await publishSpacesSync();

    return created.id;
  });

export { addSpaceRoute };
