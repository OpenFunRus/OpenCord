import { TiptapInput } from '@/components/tiptap-input';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { canonicalizeMessageEmojiHtml } from '@/helpers/message-emojis';
import { getTRPCClient } from '@/lib/trpc';
import {
  MESSAGE_MAX_LINES,
  MESSAGE_MAX_TEXT_LENGTH,
  type TMessage,
  getMessageContentLimitError,
  getTrpcError,
  isEmptyMessage,
  prepareMessageHtml
} from '@opencord/shared';
import { AutoFocus } from '@opencord/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TMessageEditInlineProps = {
  message: TMessage;
  onBlur: () => void;
};

const MessageEditInline = memo(
  ({ message, onBlur }: TMessageEditInlineProps) => {
    const { t } = useTranslation();
    const [value, setValue] = useState<string>(message.content ?? '');
    const customEmojis = useCustomEmojis();

    const onSubmit = useCallback(
      async (newValue: string | undefined) => {
        if (!newValue || isEmptyMessage(newValue)) {
          toast.error(t('messageCannotBeEmpty'));

          onBlur();

          return;
        }

        const preparedContent = prepareMessageHtml(
          canonicalizeMessageEmojiHtml(newValue, customEmojis)
        );
        const contentLimitError = getMessageContentLimitError(preparedContent);

        if (contentLimitError === 'MAX_LENGTH') {
          toast.error(`Message cannot exceed ${MESSAGE_MAX_TEXT_LENGTH} characters.`);
          onBlur();
          return;
        }

        if (contentLimitError === 'MAX_LINES') {
          toast.error(`Message cannot exceed ${MESSAGE_MAX_LINES} lines.`);
          onBlur();
          return;
        }

        const trpc = getTRPCClient();

        try {
          await trpc.messages.edit.mutate({
            messageId: message.id,
            content: preparedContent
          });

          toast.success(t('messageEdited'));
        } catch (error) {
          toast.error(getTrpcError(error, t('failedEditMessage')));
        } finally {
          onBlur();
        }
      },
      [customEmojis, message.id, onBlur, t]
    );

    return (
      <div className="flex flex-col gap-2">
        <AutoFocus>
          <TiptapInput
            value={value}
            onChange={setValue}
            onSubmit={() => onSubmit(value)}
            onCancel={onBlur}
          />
        </AutoFocus>
        <span className="text-xs text-primary/60">{t('pressEnterToSave')}</span>
      </div>
    );
  }
);

export { MessageEditInline };

