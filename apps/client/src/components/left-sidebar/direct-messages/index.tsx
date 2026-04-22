import { UnreadCount } from '@/components/unread-count';
import { UserAvatar } from '@/components/user-avatar';
import { setSelectedDmChannelId } from '@/features/app/actions';
import { useSelectedDmChannelId } from '@/features/app/hooks';
import { useChannels } from '@/features/server/channels/hooks';
import { useUnreadMessagesCount } from '@/features/server/hooks';
import {
  useOwnUserId,
  useUserById,
  useUsers
} from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  UserStatus,
  type TDirectMessageConversation,
  type TJoinedPublicUser
} from '@opencord/shared';
import { Spinner } from '@opencord/ui';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SearchUserDropdown } from './search-user-dropdown';

const isPresenceOnline = (status: UserStatus | undefined) =>
  status === UserStatus.ONLINE || status === UserStatus.IDLE;

type TDirectMessageItemProps = {
  dm: TDirectMessageConversation;
  isNotes?: boolean;
  selected: boolean;
  onSelect: () => void;
};

const DirectMessageItem = memo(
  ({ dm, isNotes = false, selected, onSelect }: TDirectMessageItemProps) => {
    const { t } = useTranslation('sidebar');
    const user = useUserById(dm.userId);
    const unreadCount = useUnreadMessagesCount(dm.channelId);

    if (!user) {
      return null;
    }

    return (
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-sm font-medium text-[#9fb2c8] transition-all hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white',
          selected &&
            'border-[#2f7ad1]/35 bg-[#206bc4]/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
        )}
        onClick={onSelect}
      >
        <UserAvatar
          userId={user.id}
          className="h-6 w-6"
          showUserPopover={!isNotes}
          showStatusBadge={!isNotes}
        />
        <span className="truncate flex-1 text-left">
          {isNotes ? t('personalNotes') : user.name}
        </span>
        <UnreadCount count={unreadCount} />
      </button>
    );
  }
);

type TDmUserRowProps = {
  user: TJoinedPublicUser;
  onOpen: () => void;
};

const DmUserRow = memo(({ user, onOpen }: TDmUserRowProps) => (
  <button
    type="button"
    className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-sm font-medium text-[#9fb2c8] transition-all hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
    onClick={onOpen}
  >
    <UserAvatar userId={user.id} className="h-6 w-6" showUserPopover />
    <span className="truncate flex-1 text-left">{user.name}</span>
  </button>
));

const DirectMessages = memo(() => {
  const { t } = useTranslation('sidebar');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<
    TDirectMessageConversation[]
  >([]);
  const [query, setQuery] = useState('');
  const users = useUsers();
  const channels = useChannels();
  const ownUserId = useOwnUserId();
  const selectedDmChannelId = useSelectedDmChannelId();
  const visibleUserIds = useMemo(
    () => new Set(users.map((user) => user.id)),
    [users]
  );

  const fetchConversations = useCallback(async () => {
    const trpc = getTRPCClient();

    setLoading(true);

    try {
      const items = await trpc.dms.get.query();

      setConversations(items);
    } catch {
      toast.error(t('failedLoadDMs'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchConversations();
  }, [channels.length, fetchConversations]);

  useEffect(() => {
    if (!ownUserId) return;

    const trpc = getTRPCClient();

    void trpc.dms.open
      .mutate({ userId: ownUserId })
      .then(() => fetchConversations())
      .catch(() => {
        // ignore notes bootstrap errors here; normal DM list error handling stays below
      });
  }, [fetchConversations, ownUserId]);

  useEffect(() => {
    const trpc = getTRPCClient();

    const sub = trpc.dms.onConversationOpen.subscribe(undefined, {
      onData: () => fetchConversations()
    });

    return () => sub.unsubscribe();
  }, [fetchConversations]);

  const directMessageUserIds = useMemo(
    () => new Set(conversations.map((dm) => dm.userId)),
    [conversations]
  );

  const usersToStartDm = useMemo(() => {
    return users.filter(
      (user) =>
        user.id !== ownUserId &&
        !user.banned &&
        user.name !== DELETED_USER_IDENTITY_AND_NAME &&
        !directMessageUserIds.has(user.id) &&
        user.name.toLowerCase().includes(query.trim().toLowerCase())
    );
  }, [directMessageUserIds, ownUserId, query, users]);

  const visibleConversations = useMemo(
    () => conversations.filter((dm) => visibleUserIds.has(dm.userId)),
    [conversations, visibleUserIds]
  );

  const conversationUserIds = useMemo(
    () => new Set(visibleConversations.map((dm) => dm.userId)),
    [visibleConversations]
  );

  const q = query.trim().toLowerCase();

  const sortedRecentDms = useMemo(() => {
    let list = [...visibleConversations].sort(
      (a, b) =>
        Number(b.userId === ownUserId) - Number(a.userId === ownUserId) ||
        b.lastMessageAt - a.lastMessageAt
    );
    if (q) {
      list = list.filter((dm) => {
        if (dm.userId === ownUserId) {
          return t('personalNotes').toLowerCase().includes(q);
        }

        const u = users.find((x) => x.id === dm.userId);
        return u?.name.toLowerCase().includes(q);
      });
    }
    return list;
  }, [visibleConversations, users, q, ownUserId]);

  const { onlineOthers, offlineOthers } = useMemo(() => {
    const rest = users.filter(
      (u) =>
        u.id !== ownUserId &&
        !u.banned &&
        u.name !== DELETED_USER_IDENTITY_AND_NAME &&
        !conversationUserIds.has(u.id)
    );
    const nameMatch = (u: TJoinedPublicUser) =>
      !q || u.name.toLowerCase().includes(q);
    const filtered = rest.filter(nameMatch);
    const online = filtered
      .filter((u) => isPresenceOnline(u.status))
      .sort((a, b) => a.name.localeCompare(b.name));
    const offline = filtered
      .filter((u) => !isPresenceOnline(u.status))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { onlineOthers: online, offlineOthers: offline };
  }, [users, ownUserId, conversationUserIds, q]);

  const onStartDm = useCallback(
    async (userId: number) => {
      const trpc = getTRPCClient();

      try {
        const result = await trpc.dms.open.mutate({ userId });

        setSelectedDmChannelId(result.channelId);
        await fetchConversations();
      } catch {
        toast.error(t('couldNotOpenDM'));
      }
    },
    [fetchConversations, t]
  );

  const listEmpty =
    !loading &&
    sortedRecentDms.length === 0 &&
    onlineOthers.length === 0 &&
    offlineOthers.length === 0;

  return (
    <div className="flex-1 overflow-y-auto px-2 py-3">
      <div className="mb-1 flex items-center justify-between px-2 py-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8fa2bb]">
          {t('directMessages')}
        </span>
        <SearchUserDropdown
          query={query}
          setQuery={setQuery}
          usersToStartDm={usersToStartDm}
          onStartDm={onStartDm}
        />
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRecentDms.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7c94]">
                {t('recentConversations')}
              </div>
              {sortedRecentDms.map((dm) => (
                <DirectMessageItem
                  key={dm.channelId}
                  dm={dm}
                  isNotes={dm.userId === ownUserId}
                  selected={selectedDmChannelId === dm.channelId}
                  onSelect={() => setSelectedDmChannelId(dm.channelId)}
                />
              ))}
            </div>
          )}

          {onlineOthers.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7c94]">
                {t('onlineWithoutDm')}
              </div>
              {onlineOthers.map((user) => (
                <DmUserRow
                  key={user.id}
                  user={user}
                  onOpen={() => onStartDm(user.id)}
                />
              ))}
            </div>
          )}

          {offlineOthers.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7c94]">
                {t('offlineWithoutDm')}
              </div>
              {offlineOthers.map((user) => (
                <DmUserRow
                  key={user.id}
                  user={user}
                  onOpen={() => onStartDm(user.id)}
                />
              ))}
            </div>
          )}

          {listEmpty && (
            <div className="px-2 py-4 text-xs text-[#8fa2bb]">
              {q ? t('noUsersAvailable') : t('noDMsYet')}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export { DirectMessages };
