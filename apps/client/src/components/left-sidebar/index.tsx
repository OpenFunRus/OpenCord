import { ResizableSidebar } from '@/components/resizable-sidebar';
import { useDmsOpen } from '@/features/app/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { Categories } from './categories';
import { DirectMessages } from './direct-messages';
import { DmButton } from './direct-messages/dm-button';
import { SpacesStrip } from './spaces-strip';
import { UserControl } from './user-control';
import { VoiceControl } from './voice-control';

const MIN_WIDTH = 336;
const MAX_WIDTH = 336;
const DEFAULT_WIDTH = 336;

type TLeftSidebarProps = {
  className?: string;
  isOpen?: boolean;
};

const LeftSidebar = memo(({ className, isOpen = true }: TLeftSidebarProps) => {
  const dmsOpen = useDmsOpen();
  const publicSettings = usePublicServerSettings();

  return (
    <ResizableSidebar
      storageKey={LocalStorageKey.LEFT_SIDEBAR_WIDTH}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      defaultWidth={DEFAULT_WIDTH}
      edge="right"
      resizable={false}
      isOpen={isOpen}
      className={cn('h-full', className)}
    >
      <div className="w-full border-b border-[#2b3544] bg-[#172231]/90 px-4 py-3 backdrop-blur-sm">
        <SpacesStrip />
      </div>
      {publicSettings?.directMessagesEnabled && <DmButton />}
      <div className="flex-1 overflow-y-auto bg-[#182433]">
        {dmsOpen ? <DirectMessages /> : <Categories />}
      </div>
      <VoiceControl />
      <UserControl />
    </ResizableSidebar>
  );
});

export { UserControl } from './user-control';
export { LeftSidebar };

