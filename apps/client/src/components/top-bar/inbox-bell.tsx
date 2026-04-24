import { UserAvatar } from '@/components/user-avatar';
import { clearInboxDismissed, dismissInboxMessage } from '@/features/app/actions';
import { inboxDismissedMessageIdsSelector } from '@/features/app/selectors';
import { jumpToMessage } from '@/features/server/actions';
import { setChannelReadState } from '@/features/server/channels/actions';
import {
  allChannelsSelector,
  channelPermissionsSelector,
  channelsReadStatesSelector
} from '@/features/server/channels/selectors';
import { useIsOwnUserOwner } from '@/features/server/hooks';
import { messagesByChannelIdSelector } from '@/features/server/messages/selectors';
import { spacesSelector } from '@/features/server/spaces/selectors';
import {
  muteSettingsSelector,
  ownUserIdSelector,
  ownUserSelector,
  userByIdSelector
} from '@/features/server/users/selectors';
import { store, type IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  ChannelPermission,
  ChannelType,
  hasMention,
  type TChannel,
  type TMessage,
  type TMuteSettings
} from '@opencord/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@opencord/ui';
import { Bell } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';

const MAX_INBOX_ROWS = 25;
const SNIPPET_LEN = 120;

const htmlToPlainSnippet = (html: string | null | undefined, maxLen: number) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
};

const canViewChannel = (
  channel: TChannel,
  isOwner: boolean,
  permissions: IRootState['server']['channelPermissions'][number] | undefined
): boolean => {
  if (channel.isDm) return true;
  if (isOwner) return true;
  if (!channel.private) return true;
  return permissions?.permissions?.[ChannelPermission.VIEW_CHANNEL] === true;
};

const isInboxMuted = (
  channel: TChannel,
  mute: TMuteSettings,
  dmPeerUserId: number | undefined
): boolean => {
  if (mute.mutedChannelIds.includes(channel.id)) return true;
  if (channel.spaceId && mute.mutedSpaceIds.includes(channel.spaceId)) return true;
  if (channel.isDm && dmPeerUserId !== undefined && mute.mutedDmUserIds.includes(dmPeerUserId)) {
    return true;
  }
  return false;
};

type TInboxRow = {
  message: TMessage;
  channel: TChannel;
  spaceLabel: string;
  channelLabel: string;
  authorName: string;
  hasMention: boolean;
};

const InboxBell = memo(() => {
  const { t } = useTranslation('topbar');
  const ownUserId = useSelector(ownUserIdSelector);
  const ownUser = useSelector(ownUserSelector);
  const isOwner = useIsOwnUserOwner();
  const spaces = useSelector(spacesSelector);
  const channels = useSelector(allChannelsSelector);
  const readStates = useSelector(channelsReadStatesSelector);
  const channelPermissions = useSelector(channelPermissionsSelector);
  const muteSettings = useSelector(muteSettingsSelector);
  const dismissedIds = useSelector(inboxDismissedMessageIdsSelector);
  const dismissedSet = useMemo(() => new Set(dismissedIds), [dismissedIds]);

  const [dmChannelToPeer, setDmChannelToPeer] = useState<Record<number, number>>({});
  const [markingAll, setMarkingAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const trpc = getTRPCClient();
        const list = await trpc.dms.get.query();
        if (cancelled) return;
        const map: Record<number, number> = {};
        for (const dm of list) {
          map[dm.channelId] = dm.userId;
        }
        setDmChannelToPeer(map);
      } catch {
        // ignore
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const spaceNameById = useMemo(() => {
    const m = new Map<number, string>();
    spaces.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [spaces]);

  const inboxRows = useMemo((): TInboxRow[] => {
    if (!ownUserId || !ownUser) return [];

    const state = store.getState();
    const rows: TInboxRow[] = [];

    for (const channel of channels) {
      if (channel.type !== ChannelType.TEXT) continue;
      if (!canViewChannel(channel, isOwner, channelPermissions[channel.id])) continue;

      const peer = channel.isDm ? dmChannelToPeer[channel.id] : undefined;
      if (isInboxMuted(channel, muteSettings, peer)) continue;

      const unread = readStates[channel.id] ?? 0;
      if (unread <= 0) continue;

      const messages = messagesByChannelIdSelector(state, channel.id) as TMessage[];
      const unreadSlice = messages.slice(-unread).filter((m) => m.userId !== ownUserId);

      const spaceLabel = channel.isDm
        ? t('inboxDmSpace')
        : (channel.spaceId ? spaceNameById.get(channel.spaceId) : undefined) ?? t('inboxUnknownSpace');

      const channelLabel = channel.name;

      for (const message of unreadSlice) {
        if (dismissedSet.has(message.id)) continue;

        const mention = hasMention(message.content, {
          userId: ownUser.id,
          roleIds: ownUser.roleIds
        });

        const author = userByIdSelector(state, message.userId);

        rows.push({
          message,
          channel,
          spaceLabel,
          channelLabel,
          authorName: author?.name ?? t('inboxUnknownUser'),
          hasMention: mention
        });
      }
    }

    rows.sort((a, b) => {
      if (a.hasMention !== b.hasMention) return a.hasMention ? -1 : 1;
      return b.message.id - a.message.id;
    });

    return rows.slice(0, MAX_INBOX_ROWS);
  }, [
    channelPermissions,
    channels,
    dismissedSet,
    dmChannelToPeer,
    isOwner,
    muteSettings,
    ownUser,
    ownUserId,
    readStates,
    spaceNameById,
    t
  ]);

  const totalUnread = useMemo(() => {
    let sum = 0;
    for (const channel of channels) {
      if (channel.type !== ChannelType.TEXT) continue;
      if (!canViewChannel(channel, isOwner, channelPermissions[channel.id])) continue;
      const peer = channel.isDm ? dmChannelToPeer[channel.id] : undefined;
      if (isInboxMuted(channel, muteSettings, peer)) continue;
      sum += readStates[channel.id] ?? 0;
    }
    return sum;
  }, [channelPermissions, channels, dmChannelToPeer, isOwner, muteSettings, readStates]);

  const mentionUnreadCount = useMemo(() => {
    if (!ownUserId || !ownUser) return 0;
    const state = store.getState();
    let n = 0;
    for (const channel of channels) {
      if (channel.type !== ChannelType.TEXT) continue;
      if (!canViewChannel(channel, isOwner, channelPermissions[channel.id])) continue;
      const peer = channel.isDm ? dmChannelToPeer[channel.id] : undefined;
      if (isInboxMuted(channel, muteSettings, peer)) continue;
      const unread = readStates[channel.id] ?? 0;
      if (unread <= 0) continue;
      const messages = messagesByChannelIdSelector(state, channel.id) as TMessage[];
      const unreadSlice = messages.slice(-unread).filter((m) => m.userId !== ownUserId);
      for (const message of unreadSlice) {
        if (dismissedSet.has(message.id)) continue;
        if (
          hasMention(message.content, {
            userId: ownUser.id,
            roleIds: ownUser.roleIds
          })
        ) {
          n += 1;
        }
      }
    }
    return n;
  }, [
    channelPermissions,
    channels,
    dismissedSet,
    dmChannelToPeer,
    isOwner,
    muteSettings,
    ownUser,
    ownUserId,
    readStates
  ]);

  const onRowClick = useCallback((row: TInboxRow) => {
    dismissInboxMessage(row.message.id);
    jumpToMessage({
      channelId: row.channel.id,
      messageId: row.message.id,
      isDm: row.channel.isDm
    });
    setMenuOpen(false);
  }, []);

  const onMarkAllRead = useCallback(async () => {
    const targets = channels.filter((channel) => {
      if (channel.type !== ChannelType.TEXT) return false;
      if (!canViewChannel(channel, isOwner, channelPermissions[channel.id])) return false;
      const peer = channel.isDm ? dmChannelToPeer[channel.id] : undefined;
      if (isInboxMuted(channel, muteSettings, peer)) return false;
      return (readStates[channel.id] ?? 0) > 0;
    });

    if (targets.length === 0) {
      clearInboxDismissed();
      setMenuOpen(false);
      return;
    }

    setMarkingAll(true);
    const trpc = getTRPCClient();

    try {
      await Promise.all(
        targets.map((ch) =>
          trpc.channels.markAsRead.mutate({ channelId: ch.id }).catch(() => undefined)
        )
      );
      for (const ch of targets) {
        setChannelReadState(ch.id, { count: 0 });
      }
      clearInboxDismissed();
      setMenuOpen(false);
    } catch {
      toast.error(t('inboxMarkAllFailed'));
    } finally {
      setMarkingAll(false);
    }
  }, [
    channelPermissions,
    channels,
    dmChannelToPeer,
    isOwner,
    muteSettings,
    readStates,
    t
  ]);

  const showBadge = totalUnread > 0;
  const badgeIsMention = mentionUnreadCount > 0;
  const badgeCount = totalUnread;

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={t('inboxTitle')}
          className="relative h-9 w-9 shrink-0 rounded-lg border border-[#314055] !bg-[#172231] text-[#8fa2bb] hover:!bg-[#1b2940] hover:border-[#3d516b] hover:text-white"
        >
          <Bell className="h-4 w-4" />
          {showBadge && (
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[0.65rem] font-semibold leading-none text-white shadow ring-2 ring-[#182433]',
                badgeIsMention ? 'bg-red-500' : 'bg-[#206bc4]'
              )}
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] border-[#314055] bg-[#172231] p-0 text-[#d7e2f0] shadow-[0_20px_48px_rgba(2,6,23,0.45)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#2b3544] px-3 py-2">
          <span className="text-sm font-semibold text-white">{t('inboxTitle')}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={markingAll || totalUnread === 0}
            onClick={(e) => {
              e.preventDefault();
              void onMarkAllRead();
            }}
            className="h-8 shrink-0 text-xs text-[#8fa2bb] hover:bg-[#1b2940] hover:text-white"
          >
            {t('inboxMarkAllRead')}
          </Button>
        </div>
        <div className="max-h-[min(70dvh,420px)] overflow-y-auto py-1">
          {inboxRows.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[#8fa2bb]">{t('inboxEmpty')}</p>
          ) : (
            inboxRows.map((row) => (
              <button
                key={row.message.id}
                type="button"
                onClick={() => onRowClick(row)}
                className={cn(
                  'flex w-full flex-col gap-1 border-b border-[#243140] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#1b2940]',
                  row.hasMention &&
                    'border-l-2 border-l-amber-400/90 bg-amber-500/[0.06] pl-[calc(0.75rem-2px)]'
                )}
              >
                <div className="truncate text-[0.7rem] font-medium uppercase tracking-wide text-[#6f839b]">
                  {row.spaceLabel}
                  <span className="text-[#4d5f73]"> · </span>
                  <span className="normal-case text-[#8fa2bb]">{row.channelLabel}</span>
                </div>
                <div className="flex min-w-0 gap-2">
                  <UserAvatar userId={row.message.userId} className="mt-0.5 h-8 w-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">{row.authorName}</span>
                      {row.hasMention && (
                        <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[0.65rem] font-medium text-red-300">
                          @
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        'truncate text-xs leading-snug text-[#9fb2c8]',
                        row.hasMention &&
                          'underline decoration-amber-400 decoration-2 underline-offset-2'
                      )}
                    >
                      {htmlToPlainSnippet(row.message.content, SNIPPET_LEN)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export { InboxBell };
