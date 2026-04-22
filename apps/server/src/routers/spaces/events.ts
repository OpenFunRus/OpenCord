import { ServerEvents } from '@opencord/shared';
import { protectedProcedure } from '../../utils/trpc';

const onSpacesSyncRoute = protectedProcedure.subscription(async ({ ctx }) => {
  return ctx.pubsub.subscribeFor(ctx.userId, ServerEvents.SPACES_SYNC);
});

export { onSpacesSyncRoute };
