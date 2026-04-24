import { Permission } from '@opencord/shared';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { roles, users } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const normalizeIds = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b);

const updateUserVisibilityRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      canSeeUsersFromOwnRoles: z.boolean(),
      visibleUserIds: z.array(z.number().int().positive()).max(500),
      visibleRoleIds: z.array(z.number().int().positive()).max(500)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    const targetUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1)
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    const visibleUserIds = normalizeIds(
      input.visibleUserIds.filter((userId) => userId !== input.userId)
    );
    const visibleRoleIds = normalizeIds(input.visibleRoleIds);

    if (visibleUserIds.length > 0) {
      const existingUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, visibleUserIds));

      invariant(existingUsers.length === visibleUserIds.length, {
        code: 'BAD_REQUEST',
        message: 'One or more users were not found'
      });
    }

    if (visibleRoleIds.length > 0) {
      const existingRoles = await db
        .select({ id: roles.id })
        .from(roles)
        .where(inArray(roles.id, visibleRoleIds));

      invariant(existingRoles.length === visibleRoleIds.length, {
        code: 'BAD_REQUEST',
        message: 'One or more roles were not found'
      });
    }

    await db
      .update(users)
      .set({
        canSeeUsersFromOwnRoles: input.canSeeUsersFromOwnRoles,
        visibleUserIds,
        visibleRoleIds
      })
      .where(eq(users.id, input.userId));

    await publishUser(input.userId, 'update');
  });

export { updateUserVisibilityRoute };
