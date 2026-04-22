import { Permission } from '@opencord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishSpacesSync } from '../../db/publishers';
import { spaceRoles, spaces } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const deleteSpaceRoute = protectedProcedure
  .input(
    z.object({
      spaceId: z.number().min(1)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_SPACES);

    const existingSpace = await db
      .select()
      .from(spaces)
      .where(eq(spaces.id, input.spaceId))
      .get();

    invariant(existingSpace, {
      code: 'NOT_FOUND',
      message: 'Space not found.'
    });

    invariant(!existingSpace.isDefault, {
      code: 'FORBIDDEN',
      message: 'Default space cannot be deleted.'
    });

    await db.delete(spaceRoles).where(eq(spaceRoles.spaceId, input.spaceId));
    await db.delete(spaces).where(eq(spaces.id, input.spaceId));

    await publishSpacesSync();
  });

export { deleteSpaceRoute };
