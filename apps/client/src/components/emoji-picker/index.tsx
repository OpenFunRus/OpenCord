import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import {
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@opencord/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_EMOJIS, searchEmojis } from './emoji-data';
import { EmojiGrid } from './emoji-grid';
import { GifsTab } from './gifs-tab';
import { NativeEmojiTab } from './native-emoji-tab';
import { useRecentEmojis } from './use-recent-emojis';

type TEmojiPickerProps = {
  children?: React.ReactNode;
  onEmojiSelect: (emoji: TEmojiItem) => void;
  onGifSelect?: (gifUrl: string) => void;
  defaultTab?: 'native' | 'gifs';
  showGifs?: boolean;
  autoFocusSearch?: boolean;
  modal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  anchorPosition?: {
    x: number;
    y: number;
  } | null;
  side?: React.ComponentProps<typeof PopoverContent>['side'];
  align?: React.ComponentProps<typeof PopoverContent>['align'];
  sideOffset?: number;
};

const EmojiPicker = memo(
  ({
    children,
    onEmojiSelect,
    onGifSelect,
    defaultTab = 'native',
    showGifs = true,
    autoFocusSearch = true,
    modal = false,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    anchorPosition = null,
    side = 'bottom',
    align = 'start',
    sideOffset = 8
  }: TEmojiPickerProps) => {
    const { t } = useTranslation('common');
    const [internalOpen, setInternalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'native' | 'gifs'>(
      showGifs ? defaultTab : 'native'
    );
    const [gifReloadKey, setGifReloadKey] = useState(0);
    const { addRecent } = useRecentEmojis();

    const isSearching = search.trim().length > 0;
    const isGifsTab = activeTab === 'gifs';

    const searchResults = useMemo(
      () => (isSearching && !isGifsTab ? searchEmojis(ALL_EMOJIS, search) : []),
      [isSearching, isGifsTab, search]
    );

    const closePicker = useCallback(() => {
      if (controlledOnOpenChange) {
        controlledOnOpenChange(false);
      } else {
        setInternalOpen(false);
      }

      setSearch('');
    }, [controlledOnOpenChange]);

    const handleEmojiSelect = useCallback(
      (emoji: TEmojiItem) => {
        onEmojiSelect(emoji);
        closePicker();
      },
      [closePicker, onEmojiSelect]
    );

    const handleSearchResultSelect = useCallback(
      (emoji: TEmojiItem) => {
        handleEmojiSelect(emoji);
        requestAnimationFrame(() => addRecent(emoji));
      },
      [handleEmojiSelect, addRecent]
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
      },
      []
    );

    const handleGifSelect = useCallback(
      (gifUrl: string) => {
        onGifSelect?.(gifUrl);
        closePicker();
      },
      [closePicker, onGifSelect]
    );

    const handleTabChange = useCallback(
      (tab: string) => {
        if (!showGifs && tab === 'gifs') {
          return;
        }

        if (tab !== 'native' && tab !== 'gifs') {
          return;
        }

        setActiveTab(tab);
        setSearch('');

        if (tab === 'gifs') {
          setGifReloadKey((value) => value + 1);
        }
      },
      [showGifs]
    );

    const open = controlledOpen ?? internalOpen;

    const handleOpenChange = useCallback((nextOpen: boolean) => {
      if (controlledOnOpenChange) {
        controlledOnOpenChange(nextOpen);
      } else {
        setInternalOpen(nextOpen);
      }

      if (!nextOpen) {
        setSearch('');
        return;
      }

      if (showGifs && activeTab === 'gifs') {
        setGifReloadKey((value) => value + 1);
      }
    }, [activeTab, controlledOnOpenChange, showGifs]);

    return (
      <Popover open={open} onOpenChange={handleOpenChange} modal={modal}>
        {anchorPosition ? (
          <PopoverAnchor asChild>
            <div
              aria-hidden
              className="pointer-events-none fixed h-px w-px"
              style={{ left: anchorPosition.x, top: anchorPosition.y }}
            />
          </PopoverAnchor>
        ) : children ? (
          <PopoverTrigger asChild>{children}</PopoverTrigger>
        ) : null}
        <PopoverContent
          className="h-100 w-[320px] overflow-hidden border border-[#314055] bg-[#172231] p-0 text-[#d7e2f0] shadow-[0_20px_48px_rgba(2,6,23,0.45)]"
          align={align}
          side={side}
          sideOffset={sideOffset}
          onOpenAutoFocus={(event) => {
            if (!autoFocusSearch) {
              event.preventDefault();
            }
          }}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-[#314055] p-3">
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={handleSearchChange}
                className="h-9 border-[#314055] bg-[#101926] text-[#d7e2f0] placeholder:text-[#6e819a] focus-visible:border-[#3d516b] focus-visible:ring-[#206bc4]/20"
                autoFocus={autoFocusSearch}
              />
            </div>

            {isSearching && !isGifsTab ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="px-3 py-2 text-xs font-medium text-[#8fa2bb]">
                  {t('searchResults', { count: searchResults.length })}
                </div>
                <div className="min-h-0 flex-1">
                  <EmojiGrid
                    emojis={searchResults}
                    onSelect={handleSearchResultSelect}
                  />
                </div>
              </div>
            ) : showGifs ? (
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="px-3 pt-2 pb-1">
                  <TabsList className="grid w-full grid-cols-2 gap-1 overflow-hidden rounded-md border border-[#314055] bg-[#1a2738] p-1">
                    <TabsTrigger
                      value="native"
                      className="h-7 w-full min-w-0 overflow-hidden rounded-sm border border-[#314055] bg-[#101926] px-1 text-[11px] leading-none text-[#8fa2bb] data-[state=active]:border-[#4677b8] data-[state=active]:bg-[#223146] data-[state=active]:text-white"
                    >
                      <span className="block w-full truncate">{t('emojiTab')}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="gifs"
                      className="h-7 w-full min-w-0 overflow-hidden rounded-sm border border-[#314055] bg-[#101926] px-1 text-[11px] leading-none text-[#8fa2bb] data-[state=active]:border-[#4677b8] data-[state=active]:bg-[#223146] data-[state=active]:text-white"
                    >
                      <span className="block w-full truncate">{t('gifsTab')}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="native" className="flex-1 mt-0 min-h-0">
                  <NativeEmojiTab onEmojiSelect={handleEmojiSelect} />
                </TabsContent>
                <TabsContent
                  value="gifs"
                  className="mt-0 flex-1 min-h-0 overflow-hidden"
                >
                  <GifsTab
                    open={open}
                    active={isGifsTab}
                    search={search}
                    reloadKey={gifReloadKey}
                    onSelect={handleGifSelect}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <NativeEmojiTab onEmojiSelect={handleEmojiSelect} />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

EmojiPicker.displayName = 'EmojiPicker';

export { EmojiPicker };

