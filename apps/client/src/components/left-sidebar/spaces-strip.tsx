import { Dialog } from '@/components/dialogs/dialogs';
import { MuteBadge } from '@/components/unread-count';
import { SpaceAvatar } from '@/components/space-avatar';
import { useSpaceUnreadCount } from '@/features/server/spaces/hooks';
import { openDialog, requestConfirmation } from '@/features/dialogs/actions';
import { useCan } from '@/features/server/hooks';
import { selectSpace } from '@/features/server/spaces/actions';
import { useSelectedSpaceId, useSpaces } from '@/features/server/spaces/hooks';
import { toggleSpaceMute } from '@/features/server/users/actions';
import { useIsSpaceMuted } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { Permission, type TFile, type TJoinedSpace } from '@opencord/shared';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip
} from '@opencord/ui';
import { Pencil, Plus, Trash2, VolumeX } from 'lucide-react';
import { getTRPCClient } from '@/lib/trpc';
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

type TSpaceButtonProps = {
  name: string;
  avatar?: TFile | null;
  selected?: boolean;
  unreadCount?: number;
  muted?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
};

const SpaceButton = ({
  name,
  avatar,
  selected = false,
  unreadCount = 0,
  muted = false,
  onClick,
  children
}: TSpaceButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative h-14 w-14 shrink-0 rounded-full border transition-all',
      selected
        ? 'border-[#63a4ff] bg-[#1f4e8a] text-white ring-2 ring-inset ring-[#8cc0ff] shadow-[inset_0_0_18px_rgba(140,192,255,0.22)]'
        : 'border-[#314055] bg-[#101926] text-[#d7e2f0] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white'
    )}
  >
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      <SpaceAvatar name={name} avatar={avatar} className="h-full w-full" />
    </div>
    {muted ? (
      <MuteBadge className="pointer-events-none absolute -right-0.5 -top-0.5 z-20 ml-0 border border-[#172231] shadow-[0_6px_16px_rgba(208,161,42,0.45)]" />
    ) : unreadCount > 0 ? (
      <div className="pointer-events-none absolute -right-0.5 -top-0.5 z-20 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#172231] bg-[#206bc4] px-1 text-[10px] font-semibold leading-none text-white shadow-[0_6px_16px_rgba(32,107,196,0.45)]">
        {unreadCount > 99 ? '99+' : unreadCount}
      </div>
    ) : null}
    {children}
  </button>
);

type TSpaceSelectItemContentProps = {
  space: TJoinedSpace;
};

const TSpaceSelectItemContent = memo(({ space }: TSpaceSelectItemContentProps) => {
  const unreadCount = useSpaceUnreadCount(space.id);
  const isMuted = useIsSpaceMuted(space.id);

  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="truncate">{space.name}</span>
      {isMuted ? (
        <MuteBadge className="ml-0 px-0" />
      ) : unreadCount > 0 ? (
        <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#206bc4] px-1.5 text-[10px] font-semibold leading-none text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      ) : null}
    </div>
  );
});

type TSpaceActionProps = {
  space: TJoinedSpace;
  selected: boolean;
  canManageSpaces: boolean;
  onClick: (spaceId: number) => void;
  onEdit: (spaceId: number) => void;
  onDelete: (spaceId: number, spaceName: string) => void;
  editLabel: string;
  deleteLabel: string;
  muteLabel: string;
  unmuteLabel: string;
  failedUpdateMute: string;
};

const SpaceAction = memo(
  ({
    space,
    selected,
    canManageSpaces,
    onClick,
    onEdit,
    onDelete,
    editLabel,
    deleteLabel,
    muteLabel,
    unmuteLabel,
    failedUpdateMute
  }: TSpaceActionProps) => {
    const unreadCount = useSpaceUnreadCount(space.id);
    const isMuted = useIsSpaceMuted(space.id);

    const handleToggleMute = useCallback(async () => {
      try {
        await toggleSpaceMute(space.id);
      } catch {
        toast.error(failedUpdateMute);
      }
    }, [failedUpdateMute, space.id]);

    const button = (
      <SpaceButton
        name={space.name}
        avatar={space.avatar}
        selected={selected}
        unreadCount={unreadCount}
        muted={isMuted}
        onClick={() => onClick(space.id)}
      />
    );

    return (
      <Tooltip content={space.name}>
        <ContextMenu key={space.id}>
          <ContextMenuTrigger asChild>
            <span className="inline-flex shrink-0">{button}</span>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuLabel>{space.name}</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleToggleMute}>
              <VolumeX className="mr-2 h-4 w-4" />
              {isMuted ? unmuteLabel : muteLabel}
            </ContextMenuItem>
            {canManageSpaces && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onEdit(space.id)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {editLabel}
                </ContextMenuItem>
                {!space.isDefault && (
                  <ContextMenuItem
                    variant="destructive"
                    onClick={() => onDelete(space.id, space.name)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deleteLabel}
                  </ContextMenuItem>
                )}
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </Tooltip>
    );
  }
);

const CREATE_SPACE_BUTTON_CLASSNAME =
  'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-dashed border-[#314055] bg-[#101926] text-[#8fa2bb] transition-colors hover:border-[#5f90d1] hover:bg-[#1b2940] hover:text-white';

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
  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId),
    [selectedSpaceId, spaces]
  );

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

  const handleSpaceClick = useCallback(
    (spaceId: number) => selectSpace(spaceId),
    []
  );

  const handleSelectSpaceChange = useCallback((value: string) => {
    selectSpace(Number(value));
  }, []);

  const renderCreateSpaceButton = useCallback(
    (className?: string) =>
      canManageSpaces ? (
        <Tooltip content={t('createSpace')}>
          <button
            type="button"
            onClick={() => openDialog(Dialog.SPACE_EDITOR)}
            className={cn(CREATE_SPACE_BUTTON_CLASSNAME, className)}
          >
            <div className="relative">
              <Plus className="h-5 w-5" />
            </div>
          </button>
        </Tooltip>
      ) : null,
    [canManageSpaces, t]
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <Select
        value={selectedSpaceId?.toString()}
        onValueChange={handleSelectSpaceChange}
      >
        <SelectTrigger className="h-11 w-full rounded-xl border-[#314055] bg-[#132033] text-left text-[#d7e2f0] hover:border-[#3d516b] hover:bg-[#18283f] focus:border-[#5f90d1] focus:ring-1 focus:ring-[#5f90d1]/35">
          <SelectValue placeholder={selectedSpace?.name} />
        </SelectTrigger>
        <SelectContent className="border-[#35506f] bg-[#1b2940] text-[#d7e2f0] shadow-[0_18px_42px_rgba(2,6,23,0.5)]">
          {spaces.map((space) => (
            <SelectItem
              key={space.id}
              value={space.id.toString()}
              className="text-[#d7e2f0] data-[highlighted]:bg-[#206bc4]/35 data-[highlighted]:text-white data-[state=checked]:bg-[#1f4e8a]/45"
            >
              <TSpaceSelectItemContent space={space} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div
        ref={scrollRef}
        className={cn(
          'hide-scrollbar flex min-w-0 items-center gap-3 overflow-x-auto overflow-y-hidden pl-1 pr-1 select-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onClickCapture={handleClickCapture}
      >
        {spaces.map((space) => (
          <SpaceAction
            key={space.id}
            space={space}
            selected={space.id === selectedSpaceId}
            canManageSpaces={canManageSpaces}
            onClick={handleSpaceClick}
            onEdit={(spaceId) => openDialog(Dialog.SPACE_EDITOR, { spaceId })}
            onDelete={handleDeleteSpace}
            editLabel={t('editLabel')}
            deleteLabel={t('deleteLabel')}
            muteLabel={t('muteSidebarItem')}
            unmuteLabel={t('unmuteSidebarItem')}
            failedUpdateMute={t('failedUpdateMute')}
          />
        ))}
        {renderCreateSpaceButton()}
      </div>
    </div>
  );
});

export { SpacesStrip };
