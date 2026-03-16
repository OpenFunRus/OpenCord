import { MessageCompose } from '@/components/message-compose';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { canonicalizeMessageEmojiHtml } from '@/helpers/message-emojis';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedPublicUser } from '@opencord/shared';
import { TYPING_MS, getTrpcError, prepareMessageHtml } from '@opencord/shared';
import { throttle } from 'lodash-es';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

type TThreadComposeProps = {
  parentMessageId: number;
  channelId: number;
  typingUsers: TJoinedPublicUser[];
};

const ThreadCompose = memo(
  ({ parentMessageId, channelId, typingUsers }: TThreadComposeProps) => {
    const [newMessage, setNewMessage] = useState('');
    const customEmojis = useCustomEmojis();

    const sendTypingSignal = useMemo(
      () =>
        throttle(async () => {
          const trpc = getTRPCClient();

          try {
            await trpc.messages.signalTyping.mutate({
              channelId,
              parentMessageId
            });
          } catch {
            // ignore
          }
        }, TYPING_MS),
      [channelId, parentMessageId]
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
            files: files.map((f) => f.id),
            parentMessageId
          });

          playSound(SoundType.MESSAGE_SENT);
        } catch (error) {
          toast.error(getTrpcError(error, 'Failed to send reply'));
          return false;
        }

        setNewMessage('');
        return true;
      },
      [channelId, customEmojis, sendTypingSignal, parentMessageId]
    );

    return (
      <MessageCompose
        channelId={channelId}
        message={newMessage}
        onMessageChange={setNewMessage}
        onSend={onSend}
        onTyping={sendTypingSignal}
        typingUsers={typingUsers}
      />
    );
  }
);

export { ThreadCompose };

