import { Dialog } from '@/components/dialogs/dialogs';
import { SpaceAvatar } from '@/components/space-avatar';
import { openDialog, requestConfirmation } from '@/features/dialogs/actions';
import { useCan } from '@/features/server/hooks';
import { selectSpace } from '@/features/server/spaces/actions';
import { useSelectedSpaceId, useSpaces } from '@/features/server/spaces/hooks';
import { cn } from '@/lib/utils';
import { Permission, type TFile } from '@opencord/shared';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Tooltip
} from '@opencord/ui';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { getTRPCClient } from '@/lib/trpc';
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

type TSpaceButtonProps = {
  name: string;
  avatar?: TFile | null;
  selected?: boolean;
  onClick?: () => void;
  children?: ReactNode;
};

const SpaceButton = ({
  name,
  avatar,
  selected = false,
  onClick,
  children
}: TSpaceButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border transition-all',
      selected
        ? 'border-[#63a4ff] bg-[#1f4e8a] text-white ring-2 ring-inset ring-[#8cc0ff] shadow-[inset_0_0_18px_rgba(140,192,255,0.22)]'
        : 'border-[#314055] bg-[#101926] text-[#d7e2f0] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white'
    )}
  >
    <SpaceAvatar name={name} avatar={avatar} className="h-14 w-14" />
    {children}
  </button>
);

const SpacesStrip = memo(() => {
  const { t } = useTranslation('sidebar');
  const spaces = useSpaces();
  const selectedSpaceId = useSelectedSpaceId();
  const can = useCan();
  const canManageSpaces = can(Permission.MANAGE_SPACES);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    startX: number;
    startScrollLeft: number;
    dragging: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;

    if (!el) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    event.preventDefault();
    el.scrollLeft += event.deltaY;
  }, []);

  const stopDragging = useCallback(() => {
    dragStateRef.current = null;
    setIsDragging(false);
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', stopDragging);
  }, []);

  const handleWindowMouseMove = useCallback((event: MouseEvent) => {
    const el = scrollRef.current;
    const dragState = dragStateRef.current;

    if (!el || !dragState) return;

    const deltaX = event.clientX - dragState.startX;

    if (!dragState.dragging) {
      if (Math.abs(deltaX) < 4) {
        return;
      }

      dragState.dragging = true;
      suppressClickRef.current = true;
      setIsDragging(true);
    }

    event.preventDefault();
    el.scrollLeft = dragState.startScrollLeft - deltaX;
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const el = scrollRef.current;

      if (!el || event.button !== 0) return;

      dragStateRef.current = {
        startX: event.clientX,
        startScrollLeft: el.scrollLeft,
        dragging: false
      };

      window.addEventListener('mousemove', handleWindowMouseMove, {
        passive: false
      });
      window.addEventListener('mouseup', stopDragging);
    },
    [handleWindowMouseMove, stopDragging]
  );

  const handleClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  useEffect(() => () => stopDragging(), [stopDragging]);

  const handleDeleteSpace = useCallback(
    async (spaceId: number, spaceName: string) => {
      const confirmed = await requestConfirmation({
        title: t('dialogs:deleteSpaceTitle', { ns: 'dialogs' }),
        message: t('dialogs:deleteSpaceMessage', {
          ns: 'dialogs',
          name: spaceName
        }),
        confirmLabel: t('deleteLabel'),
        cancelLabel: t('common:cancel', { ns: 'common' }),
        variant: 'danger'
      });

      if (!confirmed) return;

      try {
        await getTRPCClient().spaces.delete.mutate({ spaceId });
      } catch {
        toast.error(t('dialogs:spaceDeleteFailed', { ns: 'dialogs' }));
      }
    },
    [t]
  );

  return (
    <div
      ref={scrollRef}
      className={cn(
        'hide-scrollbar flex min-w-0 flex-1 items-center gap-3 overflow-x-auto overflow-y-hidden pl-1 pr-1 select-none',
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onClickCapture={handleClickCapture}
    >
      {spaces.map((space) => {
        const button = (
          <SpaceButton
            name={space.name}
            avatar={space.avatar}
            selected={space.id === selectedSpaceId}
            onClick={() => selectSpace(space.id)}
          />
        );

        if (!canManageSpaces) {
          return (
            <Tooltip key={space.id} content={space.name}>
              <span className="inline-flex shrink-0">{button}</span>
            </Tooltip>
          );
        }

        return (
          <Tooltip key={space.id} content={space.name}>
            <span className="inline-flex shrink-0">
              <ContextMenu>
                <ContextMenuTrigger asChild>{button}</ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuLabel>{space.name}</ContextMenuLabel>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => openDialog(Dialog.SPACE_EDITOR, { spaceId: space.id })}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {t('editLabel')}
                  </ContextMenuItem>
                  {!space.isDefault && (
                    <ContextMenuItem
                      variant="destructive"
                      onClick={() => handleDeleteSpace(space.id, space.name)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('deleteLabel')}
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            </span>
          </Tooltip>
        );
      })}

      {canManageSpaces && (
        <Tooltip content={t('createSpace')}>
          <button
            type="button"
            onClick={() => openDialog(Dialog.SPACE_EDITOR)}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-dashed border-[#314055] bg-[#101926] text-[#8fa2bb] transition-colors hover:border-[#5f90d1] hover:bg-[#1b2940] hover:text-white"
          >
            <div className="relative">
              <Plus className="h-5 w-5" />
            </div>
          </button>
        </Tooltip>
      )}
    </div>
  );
});

export { SpacesStrip };
