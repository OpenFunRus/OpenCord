import { RelativeTime } from '@/components/relative-time';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useCan } from '@/features/server/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import {
  getClipboardTextFromRenderedEmojiHtml,
  isEmojiOnlyHtml,
  renderMessageTextWithEmojis
} from '@/helpers/message-emojis';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { imageExtensions, Permission, type TJoinedMessage } from '@opencord/shared';
import { Tooltip } from '@opencord/ui';
import parse, { Text } from 'html-react-parser';
import { memo, useCallback, useMemo, type ClipboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FileCard } from '../file-card';
import { MessageReactions } from '../message-reactions';
import { ImageOverride } from '../overrides/image';
import { serializer } from './serializer';
import type { TFoundMedia } from './types';

type TMessageRendererProps = {
  message: TJoinedMessage;
  disableFiles?: boolean;
  disableReactions?: boolean;
};

const isGifUrl = (url: string) => {
  try {
    const parsed = new URL(url, window.location.href);
    const pathname = parsed.pathname.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    return (
      pathname.endsWith('.gif') ||
      parsed.searchParams.get('format') === 'gif' ||
      hostname.includes('tenor.com')
    );
  } catch {
    return url.toLowerCase().includes('.gif');
  }
};

const MessageRenderer = memo(
  ({ message, disableFiles, disableReactions }: TMessageRendererProps) => {
    const { t } = useTranslation();
    const ownUserId = useOwnUserId();
    const can = useCan();
    const editedByUser = useUserById(message.editedBy ?? -1);
    const isOwnMessage = useMemo(
      () => message.userId === ownUserId,
      [message.userId, ownUserId]
    );
    const canRemoveFiles = useMemo(
      () => isOwnMessage || can(Permission.MANAGE_MESSAGES),
      [can, isOwnMessage]
    );

    const emojiOnly = useMemo(() => isEmojiOnlyHtml(message.content), [message.content]);
    const hasMessageText = useMemo(() => {
      const plainText = (message.content ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .trim();

      return plainText.length > 0;
    }, [message.content]);

    const { foundMedia, messageHtml } = useMemo(() => {
      const foundMedia: TFoundMedia[] = [];

      const messageHtml = parse(message.content ?? '', {
        replace: (domNode, index) => {
          if (domNode instanceof Text) {
            return renderMessageTextWithEmojis(domNode.data, `${message.id}-${index}`);
          }

          return serializer(domNode, (found) => foundMedia.push(found), message.id);
        }
      });

      return { messageHtml, foundMedia };
    }, [message.content, message.id]);

    const onCopy = useCallback(
      (event: ClipboardEvent<HTMLDivElement>) => {
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          return;
        }

        const range = selection.getRangeAt(0);

        if (!event.currentTarget.contains(range.commonAncestorContainer)) {
          return;
        }

        const container = document.createElement('div');
        container.appendChild(range.cloneContents());

        const plainText = getClipboardTextFromRenderedEmojiHtml(container.innerHTML);

        event.clipboardData.setData('text/plain', plainText);
        event.preventDefault();
      },
      []
    );

    const onRemoveFileClick = useCallback(
      async (fileId: number) => {
        if (!fileId) return;

        const choice = await requestConfirmation({
          title: t('deleteFileTitle'),
          message: t('deleteFileMsg'),
          confirmLabel: t('deleteLabel')
        });

        if (!choice) return;

        const trpc = getTRPCClient();

        try {
          await trpc.files.delete.mutate({
            fileId
          });

          toast.success(t('fileDeleted'));
        } catch {
          toast.error(t('failedDeleteFile'));
        }
      },
      [t]
    );

    const allMedia = useMemo(() => {
      const mediaFromFiles: TFoundMedia[] = message.files
        .filter((file) =>
          imageExtensions.includes(file.extension.toLowerCase())
        )
        .map((file) => ({
          type: 'image',
          url: getFileUrl(file),
          fileId: file.id
        }));

      return [...foundMedia, ...mediaFromFiles];
    }, [foundMedia, message.files]);

    const { gifMedia, imageMedia } = useMemo(() => {
      const gifs: TFoundMedia[] = [];
      const images: TFoundMedia[] = [];

      allMedia.forEach((media) => {
        if (media.type !== 'image') {
          return;
        }

        if (isGifUrl(media.url)) {
          gifs.push(media);
        } else {
          images.push(media);
        }
      });

      return {
        gifMedia: gifs,
        imageMedia: images
      };
    }, [allMedia]);

    const nonImageFiles = useMemo(
      () =>
        message.files.filter(
          (file) => !imageExtensions.includes(file.extension.toLowerCase())
        ),
      [message.files]
    );

    return (
      <div className="flex flex-col gap-1">
        {(hasMessageText || message.editedAt) && (
          <div
            onCopy={onCopy}
            className={cn(
              'prose max-w-full wrap-break-word msg-content',
              emojiOnly && 'emoji-only',
              message.editedAt && 'msg-edited'
            )}
          >
            {messageHtml}
            {message.editedAt && (
              <Tooltip
                content={
                  <div className="flex flex-col gap-1">
                    <RelativeTime date={new Date(message.editedAt)}>
                      {(relativeTime) => (
                        <span className="text-secondary text-xs">
                          {editedByUser
                            ? getRenderedUsername(editedByUser)
                            : t('unknownUser')}{' '}
                          {relativeTime}
                        </span>
                      )}
                    </RelativeTime>
                  </div>
                }
              >
                <span className="msg-edit ml-1 text-xs text-muted-foreground">
                  {t('edited')}
                </span>
              </Tooltip>
            )}
          </div>
        )}

        {imageMedia.length > 0 && (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {imageMedia.map((media, index) => (
              <div key={`media-image-${index}`} className="min-w-0">
                <ImageOverride
                  src={media.url}
                  onRemove={
                    canRemoveFiles && media.fileId
                      ? () => onRemoveFileClick(media.fileId!)
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        )}

        {gifMedia.length > 0 && (
          <div className="flex w-full flex-col gap-2">
            {gifMedia.map((media, index) => (
              <div key={`media-gif-${index}`} className="mr-auto w-full sm:max-w-[420px]">
                <ImageOverride
                  src={media.url}
                  mediaClassName="object-left"
                  onRemove={
                    canRemoveFiles && media.fileId
                      ? () => onRemoveFileClick(media.fileId!)
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        )}

        {!disableReactions && (
          <MessageReactions
            reactions={message.reactions}
            messageId={message.id}
          />
        )}

        {nonImageFiles.length > 0 && !disableFiles && (
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {nonImageFiles.map((file) => (
              <div key={file.id} className="min-w-0">
                <FileCard
                  name={file.originalName}
                  extension={file.extension}
                  size={file.size}
                  onRemove={
                    canRemoveFiles ? () => onRemoveFileClick(file.id) : undefined
                  }
                  href={getFileUrl(file)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

export { MessageRenderer };

