import { UserAvatar } from '@/components/user-avatar';
import {
  AutoFocus,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Input
} from '@opencord/ui';
import { Plus } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const MAX_USERS = 100;

type TSearchUserDropdownProps = {
  query: string;
  setQuery: (query: string) => void;
  usersToStartDm: { id: number; name: string }[];
  onStartDm: (userId: number) => void;
};

const SearchUserDropdown = memo(
  ({
    query,
    setQuery,
    usersToStartDm,
    onStartDm
  }: TSearchUserDropdownProps) => {
    const { t } = useTranslation('sidebar');
    const { allUsers, extraUsers } = useMemo(() => {
      const filtered = usersToStartDm.filter((user) =>
        user.name.toLowerCase().includes(query.toLowerCase())
      );

      return {
        allUsers: filtered.slice(0, MAX_USERS),
        extraUsers: filtered.length - MAX_USERS
      };
    }, [usersToStartDm, query]);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            variant="ghost"
            size="sm"
            icon={Plus}
            title={t('startNewConversation')}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="max-h-80 w-64 overflow-auto rounded-xl border-[#314055] bg-[#18283f] p-1 text-[#d7e2f0] shadow-[0_18px_42px_rgba(2,6,23,0.5)]"
        >
          <div className="p-2">
            <AutoFocus>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchUser')}
                className="h-9 rounded-lg border-[#314055] bg-[#132033] text-[#d7e2f0] placeholder:text-[#8aa0bc] focus-visible:border-[#5f90d1] focus-visible:ring-[#5f90d1]/25"
              />
            </AutoFocus>
          </div>
          {allUsers.length === 0 && (
            <div className="px-2 pb-2 text-xs text-[#8fa2bb]">
              {t('noUsersAvailable')}
            </div>
          )}
          {allUsers.map((user) => (
            <DropdownMenuItem
              key={user.id}
              onClick={() => onStartDm(user.id)}
              className="rounded-lg text-[#d7e2f0] data-[highlighted]:bg-[#206bc4]/35 data-[highlighted]:text-white"
            >
              <div className="flex items-center gap-2">
                <UserAvatar
                  userId={user.id}
                  className="h-5 w-5"
                  showUserPopover
                />
                <span>{user.name}</span>
              </div>
            </DropdownMenuItem>
          ))}
          {extraUsers > 0 && (
            <div className="px-2 pb-2 text-xs text-[#8fa2bb]">
              {t('andMore', { count: extraUsers })}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

export { SearchUserDropdown };

