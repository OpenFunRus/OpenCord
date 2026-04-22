import { MessageContextMenu } from '@/components/context-menus/message';
import { openThreadSidebar } from '@/features/app/actions';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useThreadSidebar } from '@/features/app/hooks';
import { useCan } from '@/features/server/hooks';
import { useIsOwnUser, useOwnUserId } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  hasMention,
  imageExtensions,
  Permission,
  type TJoinedMessage
} from '@opencord/shared';
import { MessageSquareText } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MessageActions } from './message-actions';
import { MessageEditInline } from './message-edit-inline';
import { MessageRenderer } from './renderer';

type TMessageProps = {
  message: TJoinedMessage;
  disableActions?: boolean;
  disableFiles?: boolean;
  disableReactions?: boolean;
};

type TDownloadTarget = {
  label: string;
  url: string;
  filename?: string;
};

const Message = memo(
  ({
    message,
    disableActions,
    disableFiles,
    disableReactions
  }: TMessageProps) => {
    const { t } = useTranslation('common');
    const [isEditing, setIsEditing] = useState(false);
    const isFromOwnUser = useIsOwnUser(message.userId);
    const can = useCan();
    const { isOpen: isThreadOpen, parentMessageId: threadParentId } =
      useThreadSidebar();
    const ownUserId = useOwnUserId();

    const canManage = useMemo(
      () => can(Permission.MANAGE_MESSAGES) || isFromOwnUser,
      [can, isFromOwnUser]
    );

    const isMentioned = useMemo(
      () => hasMention(message.content, ownUserId),
      [message.content, ownUserId]
    );

    const isThreadReply = !!message.parentMessageId;
    const replyCount = message.replyCount ?? 0;
    const isActiveThread = isThreadOpen && threadParentId === message.id;

    const downloadTargets = useMemo((): TDownloadTarget[] => {
      const targets: TDownloadTarget[] = message.files.map((file) => ({
        label: file.originalName,
        url: getFileUrl(file),
        filename: file.originalName
      }));

      if (!message.content || typeof DOMParser === 'undefined') {
        return targets;
      }

      const doc = new DOMParser().parseFromString(message.content, 'text/html');
      const seenUrls = new Set(targets.map((target) => target.url));
      let mediaIndex = 1;

      doc.querySelectorAll('a[href]').forEach((node) => {
        const href = node.getAttribute('href');

        if (!href || !URL.canParse(href)) {
          return;
        }

        const parsed = new URL(href);
        const pathname = parsed.pathname.toLowerCase();
        const isImage = imageExtensions.some((ext) => pathname.endsWith(ext));

        if (!isImage || seenUrls.has(href)) {
          return;
        }

        seenUrls.add(href);
        targets.push({
          label: t('downloadMedia', { count: mediaIndex }),
          url: href
        });
        mediaIndex += 1;
      });

      return targets;
    }, [message.content, message.files, t]);

    const onThreadClick = useCallback(() => {
      openThreadSidebar(message.id, message.channelId);
    }, [message.id, message.channelId]);

    const onDeleteClick = useCallback(async () => {
      const choice = await requestConfirmation({
        title: t('deleteMessageTitle'),
        message: t('deleteMessageConfirm'),
        confirmLabel: t('deleteLabel'),
        cancelLabel: t('cancel'),
        variant: 'danger'
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.messages.delete.mutate({ messageId: message.id });
        toast.success(t('messageDeleted'));
      } catch {
        toast.error(t('failedDeleteMessage'));
      }
    }, [message.id, t]);

    const onPinClick = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.messages.togglePin.mutate({ messageId: message.id });
        toast.success(t('messagePinToggled'));
      } catch {
        toast.error(t('failedTogglePin'));
      }
    }, [message.id, t]);

    const onReactionSelect = useCallback(
      async (emoji: { shortcodes: string[] }) => {
        const shortcode = emoji.shortcodes[0];

        if (!shortcode) {
          return;
        }

        const trpc = getTRPCClient();

        try {
          await trpc.messages.toggleReaction.mutate({
            messageId: message.id,
            emoji: shortcode
          });
        } catch {
          toast.error(t('failedAddReaction'));
        }
      },
      [message.id, t]
    );

    const onDownload = useCallback((target: TDownloadTarget) => {
      const link = document.createElement('a');
      link.href = target.url;
      link.download = target.filename ?? '';
      link.target = '_blank';
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }, []);

    const content = !isEditing ? (
      <>
        <MessageRenderer
          message={message}
          disableFiles={disableFiles}
          disableReactions={disableReactions}
        />
        {!isThreadReply && replyCount > 0 && (
          <button
            type="button"
            onClick={onThreadClick}
            className="mt-1 flex items-center gap-1 text-xs text-[#7fb4f0] transition-colors hover:text-[#a8ceff] hover:underline"
          >
            <MessageSquareText className="h-3 w-3" />
            <span>{t('reply', { count: replyCount })}</span>
          </button>
        )}
        {!disableActions && (
          <MessageActions
            onEdit={() => setIsEditing(true)}
            canManage={canManage}
            messageId={message.id}
            channelId={message.channelId}
            editable={message.editable ?? false}
            isPinned={message.pinned ?? false}
            disablePin={!!message.parentMessageId}
            isThreadReply={isThreadReply}
          />
        )}
      </>
    ) : (
      <MessageEditInline
        message={message}
        onBlur={() => setIsEditing(false)}
      />
    );

    const messageCard = (
      <div
        className={cn(
          'relative ml-1 min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 transition-all duration-200 group hover:border-[#314055] hover:bg-[#223146]',
          isActiveThread && 'border-[#2f7ad1]/35 bg-[#206bc4]/12',
          isMentioned &&
            'border-[#8a6a18]/45 bg-[#5c4508]/16 shadow-[inset_3px_0_0_#dba420]'
        )}
        data-message-id={message.id}
      >
        {content}
      </div>
    );

    if (disableActions) {
      return messageCard;
    }

    return (
      <MessageContextMenu
        canManage={canManage}
        canPin={can(Permission.PIN_MESSAGES)}
        canReact={can(Permission.REACT_TO_MESSAGES)}
        editable={message.editable ?? false}
        isThreadReply={isThreadReply}
        isPinned={message.pinned ?? false}
        disablePin={!!message.parentMessageId}
        downloadTargets={downloadTargets}
        onDownload={onDownload}
        onReply={onThreadClick}
        onEdit={() => setIsEditing(true)}
        onDelete={() => void onDeleteClick()}
        onPin={() => void onPinClick()}
        onReact={(emoji) => void onReactionSelect(emoji)}
      >
        {messageCard}
      </MessageContextMenu>
    );
  }
);

export { Message };

