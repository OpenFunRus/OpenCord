import { LeftSidebar } from '@/components/left-sidebar';
import { ModViewSheet } from '@/components/mod-view-sheet';
import { Protect } from '@/components/protect';
import { TopBar } from '@/components/top-bar';
import { VoiceProvider } from '@/components/voice-provider';
import { setDmsOpen } from '@/features/app/actions';
import {
  useDmsOpen,
  useSelectedDmChannelId,
  useThreadSidebar
} from '@/features/app/hooks';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useSelectedChannelId } from '@/features/server/channels/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import { Permission, TestId } from '@opencord/shared';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ContentWrapper } from './content-wrapper';
import { PreventBrowser } from './prevent-browser';

const ServerView = memo(() => {
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const dmsOpen = useDmsOpen();
  const selectedDmChannelId = useSelectedDmChannelId();
  const selectedChannelId = useSelectedChannelId();
  const publicSettings = usePublicServerSettings();
  const previousServerChannelIdRef = useRef<number | undefined>(undefined);
  const { isOpen: isThreadSidebarOpen } = useThreadSidebar();

  const isMobileLeftSidebar = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncSidebarState = () => {
      const width = window.innerWidth;

      if (width < 768) {
        setIsLeftSidebarOpen(false);
        return;
      }

      setIsLeftSidebarOpen(true);
    };

    syncSidebarState();
    window.addEventListener('resize', syncSidebarState);

    return () => window.removeEventListener('resize', syncSidebarState);
  }, []);

  const handleLeftSidebarToggle = useCallback(() => {
    setIsLeftSidebarOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (publicSettings?.directMessagesEnabled === false && dmsOpen) {
      setDmsOpen(false);

      if (previousServerChannelIdRef.current) {
        setSelectedChannelId(previousServerChannelIdRef.current);
      }
    }
  }, [publicSettings?.directMessagesEnabled, dmsOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    if (!selectedChannelId && !selectedDmChannelId) return;

    setIsLeftSidebarOpen(false);
  }, [selectedChannelId, selectedDmChannelId]);

  return (
    <VoiceProvider>
      <div
        data-testid={TestId.SERVER_VIEW}
        className="flex h-dvh flex-col overflow-hidden bg-[#0f172a] text-[#d7e2f0] dark"
      >
        <TopBar
          onToggleLeftSidebar={handleLeftSidebarToggle}
          isLeftOpen={isLeftSidebarOpen}
        />
        <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden bg-[#111827]">
          <PreventBrowser />

          {isMobileLeftSidebar && isLeftSidebarOpen && (
            <div
              className="fixed inset-x-0 top-14 bottom-0 z-10 bg-slate-950/70 backdrop-blur-sm md:hidden"
              onClick={() => setIsLeftSidebarOpen(false)}
            />
          )}

          <LeftSidebar
            isOpen={isLeftSidebarOpen}
            className={cn(
              'fixed top-14 bottom-0 left-0 z-20 h-auto transform-gpu transition-[transform,opacity] duration-300 ease-out md:relative md:top-0 md:bottom-auto md:z-20',
              isLeftSidebarOpen
                ? 'translate-x-0 opacity-100'
                : '-translate-x-full opacity-0 md:translate-x-0 md:opacity-100'
            )}
          />

          <ContentWrapper
            isDmMode={dmsOpen}
            selectedDmChannelId={selectedDmChannelId}
            isThreadOpen={isThreadSidebarOpen}
          />

          <Protect permission={Permission.MANAGE_USERS}>
            <ModViewSheet />
          </Protect>
        </div>
      </div>
    </VoiceProvider>
  );
});

export { ServerView };
