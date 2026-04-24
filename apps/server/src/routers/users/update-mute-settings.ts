import { type TMuteSettings } from '@opencord/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUserMuteSettings } from '../../db/publishers';
import { channels, directMessages, spaces, users } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const normalizeIds = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b);

const zMuteSettings = z.object({
  mutedSpaceIds: z.array(z.number().int().positive()).max(500),
  mutedChannelIds: z.array(z.number().int().positive()).max(500),
  mutedDmUserIds: z.array(z.number().int().positive()).max(500)
});

const updateMuteSettingsRoute = protectedProcedure
  .input(zMuteSettings)
  .mutation(async ({ ctx, input }) => {
    const mutedSpaceIds = normalizeIds(input.mutedSpaceIds);
    const mutedChannelIds = normalizeIds(input.mutedChannelIds);
    const mutedDmUserIds = normalizeIds(
      input.mutedDmUserIds.filter((userId) => userId !== ctx.userId)
    );

    if (mutedSpaceIds.length > 0) {
      const existingSpaces = await db
        .select({ id: spaces.id })
        .from(spaces)
        .where(inArray(spaces.id, mutedSpaceIds))
        .all();

      invariant(existingSpaces.length === mutedSpaceIds.length, {
        code: 'BAD_REQUEST',
        message: 'Some spaces do not exist'
      });
    }

    if (mutedChannelIds.length > 0) {
      const existingChannels = await db
        .select({ id: channels.id })
        .from(channels)
        .where(inArray(channels.id, mutedChannelIds))
        .all();

      invariant(existingChannels.length === mutedChannelIds.length, {
        code: 'BAD_REQUEST',
        message: 'Some channels do not exist'
      });
    }

    if (mutedDmUserIds.length > 0) {
      const existingUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, mutedDmUserIds))
        .all();

      invariant(existingUsers.length === mutedDmUserIds.length, {
        code: 'BAD_REQUEST',
        message: 'Some users do not exist'
      });

      const dmPairs = await db
        .select({
          userOneId: directMessages.userOneId,
          userTwoId: directMessages.userTwoId
        })
        .from(directMessages)
        .where(
          and(
            inArray(directMessages.userOneId, [ctx.userId, ...mutedDmUserIds]),
            inArray(directMessages.userTwoId, [ctx.userId, ...mutedDmUserIds])
          )
        )
        .all();

      const availableDmUserIds = new Set<number>();

      for (const pair of dmPairs) {
        if (pair.userOneId === ctx.userId) {
          availableDmUserIds.add(pair.userTwoId);
        } else if (pair.userTwoId === ctx.userId) {
          availableDmUserIds.add(pair.userOneId);
        }
      }

      invariant(
        mutedDmUserIds.every((userId) => availableDmUserIds.has(userId)),
        {
          code: 'BAD_REQUEST',
          message: 'Mute settings may only target existing direct messages'
        }
      );
    }

    await db
      .update(users)
      .set({
        mutedSpaceIds,
        mutedChannelIds,
        mutedDmUserIds
      })
      .where(eq(users.id, ctx.userId));

    const nextSettings: TMuteSettings = {
      mutedSpaceIds,
      mutedChannelIds,
      mutedDmUserIds
    };

    await publishUserMuteSettings(ctx.userId);

    return nextSettings;
  });

export { updateMuteSettingsRoute, zMuteSettings };
