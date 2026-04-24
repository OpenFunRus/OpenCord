import { dismissInboxMessage, setMessageJumpTarget } from '@/features/app/actions';
import { useMessageJumpTarget } from '@/features/app/hooks';
import { useEffect, useRef } from 'react';

const useScrollToJumpTarget = (
  channelId: number,
  scrollToMessage: (messageId: number, highlightTime?: number) => Promise<void>
) => {
  const messageJumpTarget = useMessageJumpTarget();
  const isJumpingToMessage = useRef(false);

  useEffect(() => {
    if (
      !messageJumpTarget ||
      messageJumpTarget.channelId !== channelId ||
      isJumpingToMessage.current
    ) {
      return;
    }

    isJumpingToMessage.current = true;

    const targetMessageId = messageJumpTarget.messageId;

    // Highlight: 3 × 1s CSS cycles + margin for scroll/load
    scrollToMessage(targetMessageId, 3400).finally(() => {
      dismissInboxMessage(targetMessageId);
      setMessageJumpTarget(undefined);
      isJumpingToMessage.current = false;
    });
  }, [channelId, scrollToMessage, messageJumpTarget]);
};

export { useScrollToJumpTarget };
