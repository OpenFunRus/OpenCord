import { useRoleById } from '@/features/server/roles/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { UserPopover } from '../user-popover';

type TMentionChipProps = {
  kind?: 'user' | 'role' | 'everyone';
  userId?: number;
  roleId?: number;
  label?: string;
};

const MentionChip = memo(
  ({
    kind = 'user',
    userId,
    roleId,
    label: labelProp
  }: TMentionChipProps) => {
    const { t } = useTranslation('common');
    const user = useUserById(userId ?? -1);
    const role = useRoleById(roleId ?? -1);
    const ownUserId = useOwnUserId();
    const isOwnMention = kind === 'user' && ownUserId === userId;
    const label =
      kind === 'role'
        ? (role?.name ?? labelProp ?? t('deletedBadge'))
        : kind === 'everyone'
          ? (labelProp ?? 'everyone')
          : user
            ? getRenderedUsername(user)
            : (labelProp ?? t('deletedBadge'));

    const chipClassName = cn(
      'mention inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.95em] font-medium transition-colors',
      kind === 'everyone'
        ? 'border-[#8a6a18]/55 bg-[#5f4708]/30 text-[#ffd66b]'
        : kind === 'role'
          ? 'border-[#5b4aa6]/45 bg-[#352a63]/28 text-[#c9b7ff]'
          : isOwnMention
            ? 'border-[#8a6a18]/55 bg-[#5f4708]/30 text-[#ffd66b] hover:bg-[#71550d]/38'
            : 'border-[#31557f]/45 bg-[#1f3350]/28 text-[#8dc6ff] hover:bg-[#284160]'
    );

    if (kind !== 'user' || !userId) {
      return <span className={chipClassName}>@{label}</span>;
    }

    return (
      <UserPopover userId={userId}>
        <span className={cn(chipClassName, 'cursor-pointer')}>@{label}</span>
      </UserPopover>
    );
  }
);

export { MentionChip };
