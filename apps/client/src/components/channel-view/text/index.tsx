import {
  MessageCompose,
  type TMessageComposeHandle
} from '@/components/message-compose';
import {
  useCustomEmojis,
} from '@/features/server/emojis/hooks';
import {
  useChannelCan,
  useTypingUsersByChannelId
} from '@/features/server/hooks';
import { canonicalizeMessageEmojiHtml } from '@/helpers/message-emojis';
import { useMessages } from '@/features/server/messages/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { getTRPCClient } from '@/lib/trpc';
import {
  ChannelPermission,
  TYPING_MS,
  getTrpcError,
  prepareMessageHtml
} from '@opencord/shared';
import { Button, Spinner } from '@opencord/ui';
import { throttle } from 'lodash-es';
import { ArrowDown } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useScrollController } from './hooks/use-scroll-controller';
import { useScrollToJumpTarget } from './hooks/use-scroll-to-jump-target';
import { MessagesGroup } from './messages-group';
import { TextSkeleton } from './text-skeleton';
import { TextTopbar } from './text-top-bar';
import {
  getChannelDraftKey,
  getDraftMessage,
  setDraftMessage
} from './use-draft-messages';

type TChannelProps = {
  channelId: number;
  onClose?: () => void;
};

const TextChannel = memo(({ channelId, onClose }: TChannelProps) => {
  const { t } = useTranslation();
  const {
    messages,
    hasMore,
    loadMore,
    loading,
    fetching,
    groupedMessages,
    scrollToMessage,
    isHistoryMode,
    exitHistoryMode,
    moveHistoryForwardOrExit
  } = useMessages(channelId);

  useScrollToJumpTarget(channelId, scrollToMessage);

  const draftChannelKey = getChannelDraftKey(channelId);

  const [newMessage, setNewMessage] = useState(
    getDraftMessage(draftChannelKey)
  );
  const typingUsers = useTypingUsersByChannelId(channelId);
  const composeRef = useRef<TMessageComposeHandle>(null);
  const customEmojis = useCustomEmojis();

  const { containerRef, onScroll, scrollToBottom, showScrollToBottom } =
    useScrollController({
    messages,
    fetching,
    hasMore,
    loadMore,
    hasTypingUsers: typingUsers.length > 0,
    isHistoryMode,
    onHistoryBottomReached: moveHistoryForwardOrExit
    });

  const channelCan = useChannelCan(channelId);

  const sendTypingSignal = useMemo(
    () =>
      throttle(async () => {
        const trpc = getTRPCClient();

        try {
          await trpc.messages.signalTyping.mutate({ channelId });
        } catch {
          // ignore
        }
      }, TYPING_MS),
    [channelId]
  );

  const setNewMessageHandler = useCallback(
    (value: string) => {
      setNewMessage(value);
      setDraftMessage(draftChannelKey, value);
    },
    [setNewMessage, draftChannelKey]
  );

  const onSend = useCallback(
    async (message: string, files: { id: string }[]) => {
      sendTypingSignal.cancel();

      const trpc = getTRPCClient();

      try {
        await trpc.messages.send.mutate({
            content: prepareMessageHtml(
              canonicalizeMessageEmojiHtml(message, customEmojis)
            ),
          channelId,
          files: files.map((f) => f.id)
        });

        playSound(SoundType.MESSAGE_SENT);
      } catch (error) {
        toast.error(getTrpcError(error, t('failedSendMessage')));
        return false;
      }

      setNewMessageHandler('');
      // keep bottom lock even when media (e.g. GIF) grows after initial render
      [10, 80, 220, 500, 900].forEach((delay) => {
        setTimeout(() => {
          scrollToBottom();
        }, delay);
      });

      return true;
    },
    [
      channelId,
      customEmojis,
      scrollToBottom,
      sendTypingSignal,
      setNewMessageHandler,
      t
    ]
  );

  if (!channelCan(ChannelPermission.VIEW_CHANNEL) || loading) {
    return <TextSkeleton />;
  }

  return (
    <>
      {fetching && (
        <div className="absolute top-3 left-0 right-0 z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full border border-[#314055] bg-[#101926]/90 px-4 py-2 shadow-lg backdrop-blur-sm">
            <Spinner size="xs" />
            <span className="text-sm text-[#8fa2bb]">
              Fetching older messages...
            </span>
          </div>
        </div>
      )}

      <TextTopbar
        onScrollToMessage={scrollToMessage}
        channelId={channelId}
        onClose={onClose}
      />

      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          onScroll={onScroll}
          data-messages-container
          className="h-full min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 animate-in fade-in duration-500 lg:px-4"
        >
          <div className="w-full space-y-4">
            {groupedMessages.map((group, index) => (
              <MessagesGroup key={index} group={group} />
            ))}
          </div>
        </div>
        {showScrollToBottom && (
          <div className="pointer-events-none absolute bottom-4 right-4 z-20">
            <Button
              type="button"
              size="icon"
              onClick={scrollToBottom}
              title={t('scrollToBottom')}
              aria-label={t('scrollToBottom')}
              className="pointer-events-auto h-10 w-10 rounded-full border border-[#4677b8] bg-[#206bc4] text-white shadow-[0_16px_32px_rgba(15,23,42,0.45)] hover:border-[#5f90d1] hover:bg-[#2b5ea7]"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
        {isHistoryMode && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
            <Button
              type="button"
              onClick={exitHistoryMode}
              className="pointer-events-auto h-10 rounded-full border border-[#7b2a2a] bg-[#b42318] px-4 text-sm text-white shadow-[0_16px_32px_rgba(15,23,42,0.45)] hover:border-[#8f3131] hover:bg-[#d92d20]"
            >
              Выйти из истории
            </Button>
          </div>
        )}
      </div>

      <MessageCompose
        ref={composeRef}
        channelId={channelId}
        message={newMessage}
        onMessageChange={setNewMessageHandler}
        onSend={onSend}
        onTyping={sendTypingSignal}
        typingUsers={typingUsers}
        showPluginSlot
      />
    </>
  );
});

export { TextChannel };

