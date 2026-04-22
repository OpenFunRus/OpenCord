import { setDmsOpen } from '@/features/app/actions';
import { useDmsOpen } from '@/features/app/hooks';
import { useDirectMessagesUnreadCount } from '@/features/server/channels/hooks';
import { cn, Tooltip } from '@opencord/ui';
import { MessageSquare, MessagesSquare } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const DmButton = memo(() => {
  const { t } = useTranslation('sidebar');
  const directMessagesUnreadCount = useDirectMessagesUnreadCount();
  const dmsOpen = useDmsOpen();

  const openPublicChat = useCallback(() => {
    setDmsOpen(false);
  }, []);

  const openDirectMessages = useCallback(() => {
    setDmsOpen(true);
  }, []);

  return (
    <div className="border-b border-[#2b3544] bg-[#172231]/70 px-3 py-2">
      <div className="grid grid-cols-2 gap-2">
        <Tooltip content={t('openChat')}>
          <button
            type="button"
            onClick={openPublicChat}
            className={cn(
              'flex h-9 w-full items-center justify-center rounded-lg border border-[#314055] bg-[#1b2940] text-[#c4d3e3] transition-all hover:border-[#3d516b] hover:bg-[#223146] hover:text-white',
              !dmsOpen &&
                'border-[#2f7ad1]/35 bg-[#206bc4]/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
            )}
          >
            <MessagesSquare className="h-4 w-4" />
          </button>
        </Tooltip>

        <Tooltip content={t('openDirectMessages')}>
          <button
            type="button"
            onClick={openDirectMessages}
            className={cn(
              'relative flex h-9 w-full items-center justify-center rounded-lg border border-[#314055] bg-[#1b2940] text-[#c4d3e3] transition-all hover:border-[#3d516b] hover:bg-[#223146] hover:text-white',
              dmsOpen &&
                'border-[#2f7ad1]/35 bg-[#206bc4]/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
            )}
          >
            <MessageSquare className="h-4 w-4" />
            {directMessagesUnreadCount > 0 && (
              <div className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#206bc4] px-1 text-[10px] font-semibold leading-none text-white">
                {directMessagesUnreadCount > 99 ? '99+' : directMessagesUnreadCount}
              </div>
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
});

export { DmButton };

