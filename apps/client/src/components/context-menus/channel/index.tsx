import { ServerScreen } from '@/components/server-screens/screens';
import { openVoiceChatSidebar } from '@/features/app/actions';
import { requestConfirmation } from '@/features/dialogs/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { toggleChannelMute } from '@/features/server/users/actions';
import { useChannelById } from '@/features/server/channels/hooks';
import { useCan } from '@/features/server/hooks';
import { useIsChannelMuted } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { ChannelType, Permission } from '@opencord/shared';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@opencord/ui';
import { VolumeX } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TChannelContextMenuProps = {
  children: React.ReactNode;
  channelId: number;
};

const ChannelContextMenu = memo(
  ({ children, channelId }: TChannelContextMenuProps) => {
    const { t } = useTranslation('sidebar');
    const can = useCan();
    const channel = useChannelById(channelId);
    const isMuted = useIsChannelMuted(channelId);

    const canManageChannels = can(Permission.MANAGE_CHANNELS);
    const isVoiceChannel = channel?.type === ChannelType.VOICE;

    const onOpenChat = useCallback(() => {
      openVoiceChatSidebar(channelId);
    }, [channelId]);

    const onDeleteClick = useCallback(async () => {
      const choice = await requestConfirmation({
        title: t('deleteChannelTitle'),
        message: t('deleteChannelMsg'),
        confirmLabel: t('deleteLabel'),
        cancelLabel: t('cancel', { ns: 'common' })
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.channels.delete.mutate({ channelId });

        toast.success(t('channelDeleted'));
      } catch {
        toast.error(t('failedDeleteChannel'));
      }
    }, [channelId, t]);

    const onEditClick = useCallback(() => {
      openServerScreen(ServerScreen.CHANNEL_SETTINGS, { channelId });
    }, [channelId]);
    const onToggleMute = useCallback(async () => {
      try {
        await toggleChannelMute(channelId);
      } catch {
        toast.error(t('failedUpdateMute'));
      }
    }, [channelId, t]);

    return (
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>{channel?.name}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onToggleMute}>
            <VolumeX className="mr-2 h-4 w-4" />
            {isMuted ? t('unmuteSidebarItem') : t('muteSidebarItem')}
          </ContextMenuItem>
          {isVoiceChannel && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onOpenChat}>
              {t('openChat')}
              </ContextMenuItem>
            </>
          )}
          {canManageChannels && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={onEditClick}>
                {t('editLabel')}
              </ContextMenuItem>
              <ContextMenuItem variant="destructive" onClick={onDeleteClick}>
                {t('deleteLabel')}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

export { ChannelContextMenu };

