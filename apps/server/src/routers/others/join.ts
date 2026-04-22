import { ActivityLogType, ServerEvents, UserStatus } from '@opencord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { getRoles } from '../../db/queries/roles';
import { getPublicSettings, getSettings } from '../../db/queries/server';
import { getVisibleServerStructureForUser } from '../../db/queries/spaces';
import { getPublicUsers } from '../../db/queries/users';
import { users } from '../../db/schema';
import { logger } from '../../logger';
import { pluginManager } from '../../plugins';
import { eventBus } from '../../plugins/event-bus';
import { enqueueActivityLog } from '../../queues/activity-log';
import { enqueueLogin } from '../../queues/logins';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { rateLimitedProcedure, t } from '../../utils/trpc';

const joinServerRoute = rateLimitedProcedure(t.procedure, {
  maxRequests: 5,
  windowMs: 60_000,
  logLabel: 'joinServer'
})
  .input(
    z.object({
      handshakeHash: z.string(),
      password: z.string().optional()
    })
  )
  .query(async ({ input, ctx }) => {
    const connectionInfo = ctx.getConnectionInfo();
    const settings = await getSettings();
    const hasPassword = !!settings?.password;

    invariant(
      input.handshakeHash &&
        ctx.handshakeHash &&
        input.handshakeHash === ctx.handshakeHash,
      {
        code: 'FORBIDDEN',
        message: 'Invalid handshake hash'
      }
    );

    invariant(hasPassword ? input.password === settings?.password : true, {
      code: 'FORBIDDEN',
      message: 'Invalid password'
    });

    invariant(ctx.user, {
      code: 'UNAUTHORIZED',
      message: 'User not authenticated'
    });

    ctx.authenticated = true;
    ctx.setWsUserId(ctx.user.id);

    const [
      visibleStructure,
      publicUsers,
      roles,
      publicSettings
    ] = await Promise.all([
      getVisibleServerStructureForUser(ctx.user.id),
      getPublicUsers(true), // return identity to get status of already connected users
      getRoles(),
      getPublicSettings()
    ]);

    const processedPublicUsers = publicUsers.map((u) => ({
      ...u,
      status: ctx.getStatusById(u.id),
      _identity: undefined // remove identity before sending to client
    }));

    const foundPublicUser = processedPublicUsers.find(
      (u) => u.id === ctx.user.id
    );

    invariant(foundPublicUser, {
      code: 'NOT_FOUND',
      message: 'User not present in public users'
    });

    logger.info('%s joined the server', ctx.user.name);

    ctx.pubsub.publish(ServerEvents.USER_JOIN, {
      ...foundPublicUser,
      status: UserStatus.ONLINE
    });

    if (connectionInfo?.ip) {
      ctx.saveUserIp(ctx.user.id, connectionInfo.ip);
    }

    const voiceMap = VoiceRuntime.getVoiceMap();
    const externalStreamsMap = VoiceRuntime.getExternalStreamsMap();

    await db
      .update(users)
      .set({ lastLoginAt: Date.now() })
      .where(eq(users.id, ctx.user.id));

    enqueueLogin(ctx.user.id, connectionInfo);
    enqueueActivityLog({
      type: ActivityLogType.USER_JOINED,
      userId: ctx.user.id,
      ip: connectionInfo?.ip
    });

    eventBus.emit('user:joined', {
      userId: ctx.user.id,
      username: ctx.user.name
    });

    return {
      spaces: visibleStructure.spaces,
      categories: visibleStructure.categories,
      channels: visibleStructure.channels,
      users: processedPublicUsers,
      serverId: settings.serverId,
      serverName: settings.name,
      ownUserId: ctx.user.id,
      voiceMap,
      roles,
      publicSettings,
      channelPermissions: visibleStructure.channelPermissions,
      readStates: visibleStructure.readStates,
      commands: pluginManager.getCommands(),
      pluginIdsWithComponents: pluginManager.getPluginIdsWithComponents(),
      externalStreamsMap
    };
  });

export { joinServerRoute };

