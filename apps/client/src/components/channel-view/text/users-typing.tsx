import { TypingDots } from '@/components/typing-dots';
import { useTypingUsersByChannelId } from '@/features/server/hooks';
import type { TJoinedPublicUser } from '@opencord/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TUsersTypingIndicatorProps = {
  typingUsers: TJoinedPublicUser[];
};

const UsersTypingIndicator = memo(
  ({ typingUsers }: TUsersTypingIndicatorProps) => {
    const { t } = useTranslation('sidebar');

    const text =
      typingUsers.length === 1
        ? t('typingSingle', { name: typingUsers[0]?.name })
        : typingUsers.length === 2
          ? t('typingDouble', {
              first: typingUsers[0]?.name,
              second: typingUsers[1]?.name
            })
          : typingUsers.length > 2
            ? t('typingMany', {
                first: typingUsers[0]?.name,
                count: typingUsers.length - 1
              })
            : '';

    return (
      <div className="flex min-h-4 items-center gap-1 px-1 text-xs text-[#8fa2bb]">
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <TypingDots className="[&>div]:w-0.5 [&>div]:h-0.5" />
            <span>{text}</span>
          </div>
        )}
      </div>
    );
  }
);

type TUsersTypingProps = {
  channelId: number;
};

const UsersTyping = memo(({ channelId }: TUsersTypingProps) => {
  const typingUsers = useTypingUsersByChannelId(channelId);

  return <UsersTypingIndicator typingUsers={typingUsers} />;
});

export { UsersTyping, UsersTypingIndicator };

