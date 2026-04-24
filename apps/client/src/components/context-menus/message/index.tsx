import { EmojiPicker } from '@/components/emoji-picker';
import { PushPinIcon } from '@/components/pin-action-button';
import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@opencord/ui';
import { Download, MessageSquareText, Pencil, Smile, Trash } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TDownloadTarget = {
  label: string;
  url: string;
  filename?: string;
};

type TMessageContextMenuProps = {
  children: React.ReactNode;
  canManage: boolean;
  canPin: boolean;
  canReact: boolean;
  editable: boolean;
  isThreadReply: boolean;
  isPinned: boolean;
  disablePin?: boolean;
  downloadTargets: TDownloadTarget[];
  onDownload: (target: TDownloadTarget) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onReact: (emoji: TEmojiItem) => void;
};

const MessageContextMenu = memo(
  ({
    children,
    canManage,
    canPin,
    canReact,
    editable,
    isThreadReply,
    isPinned,
    disablePin,
    downloadTargets,
    onDownload,
    onReply,
    onEdit,
    onDelete,
    onPin,
    onReact
  }: TMessageContextMenuProps) => {
    const { t } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
    const [reactionPickerAnchor, setReactionPickerAnchor] = useState<{
      x: number;
      y: number;
    } | null>(null);

    const handleAction = useCallback((action: () => void) => {
      setOpen(false);
      action();
    }, []);

    const handleReactionMenuSelect = useCallback(
      (event: Event) => {
        event.preventDefault();

        const target = event.currentTarget as HTMLElement | null;
        const rect = target?.getBoundingClientRect();

        if (!rect) {
          return;
        }

        setReactionPickerAnchor({
          x: rect.right + 8,
          y: rect.top - 4
        });
        setOpen(false);
      },
      []
    );

    useEffect(() => {
      if (open || !reactionPickerAnchor) {
        return;
      }

      const timer = window.setTimeout(() => {
        setReactionPickerOpen(true);
      }, 16);

      return () => window.clearTimeout(timer);
    }, [open, reactionPickerAnchor]);

    return (
      <>
        <ContextMenu
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);

            if (nextOpen) {
              setReactionPickerOpen(false);
              setReactionPickerAnchor(null);
            }
          }}
        >
          <ContextMenuTrigger>{children}</ContextMenuTrigger>
          <ContextMenuContent
            onCloseAutoFocus={(event) => {
              event.preventDefault();
            }}
          >
            {downloadTargets.length === 1 && (
              <ContextMenuItem onClick={() => handleAction(() => onDownload(downloadTargets[0]!))}>
                <div className="flex items-center gap-2">
                  <Download />
                  <span className="pl-0.5">{t('download')}</span>
                </div>
              </ContextMenuItem>
            )}

            {downloadTargets.length > 1 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <div className="flex items-center gap-2">
                    <Download />
                    <span className="pl-0.5">{t('download')}</span>
                  </div>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {downloadTargets.map((target) => (
                    <ContextMenuItem
                      key={`${target.url}-${target.label}`}
                      onClick={() => handleAction(() => onDownload(target))}
                    >
                      {target.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}

            {!isThreadReply && (
              <ContextMenuItem onClick={() => handleAction(onReply)}>
                <MessageSquareText />
                {t('replyInThread')}
              </ContextMenuItem>
            )}

            {canManage && editable && (
              <ContextMenuItem onClick={() => handleAction(onEdit)}>
                <Pencil />
                {t('editMessage')}
              </ContextMenuItem>
            )}

            {canManage && (
              <ContextMenuItem variant="destructive" onClick={() => handleAction(onDelete)}>
                <Trash />
                {t('deleteMessageTitle')}
              </ContextMenuItem>
            )}

            {!disablePin && canPin && (
              <ContextMenuItem onClick={() => handleAction(onPin)}>
                <PushPinIcon className="h-4 w-4" />
                {isPinned ? t('unpinMessage') : t('pinMessage')}
              </ContextMenuItem>
            )}

            {canReact && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={handleReactionMenuSelect}>
                  <Smile />
                  {t('addReaction')}
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>

        {reactionPickerAnchor && (
          <EmojiPicker
            open={reactionPickerOpen}
            onOpenChange={(nextOpen) => {
              setReactionPickerOpen(nextOpen);
              if (!nextOpen) {
                setReactionPickerAnchor(null);
              }
            }}
            anchorPosition={reactionPickerAnchor}
            side="right"
            align="start"
            sideOffset={0}
            autoFocusSearch={false}
            modal
            onEmojiSelect={(emoji) => {
              setReactionPickerOpen(false);
              setReactionPickerAnchor(null);
              onReact(emoji);
            }}
            showGifs={false}
          />
        )}
      </>
    );
  }
);

export { MessageContextMenu };
