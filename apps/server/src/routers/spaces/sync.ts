import { z } from 'zod';
import { getVisibleServerStructureForUser } from '../../db/queries/spaces';
import { protectedProcedure } from '../../utils/trpc';

const syncSpacesRoute = protectedProcedure
  .input(z.void())
  .query(async ({ ctx }) => {
    return getVisibleServerStructureForUser(ctx.user.id);
  });

export { syncSpacesRoute };
