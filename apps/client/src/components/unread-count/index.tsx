import { cn } from '@opencord/ui';
import { VolumeX } from 'lucide-react';
import { memo } from 'react';

type TUnreadCountProps = {
  count: number;
  hasMention?: boolean;
};

const UnreadCount = memo(({ count, hasMention }: TUnreadCountProps) => {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#206bc4] px-1.5 text-xs font-medium text-white',
        hasMention && 'bg-red-500 text-white'
      )}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
});

type TMuteBadgeProps = {
  className?: string;
};

const MuteBadge = memo(({ className }: TMuteBadgeProps) => (
  <div
    className={cn(
      'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d0a12a] px-1.5 text-[#111827] shadow-[0_6px_16px_rgba(208,161,42,0.35)]',
      className
    )}
  >
    <VolumeX className="h-3 w-3" />
  </div>
));

export { MuteBadge, UnreadCount };

