import {
  useVolumeControl,
  type TVolumeKey
} from '@/components/voice-provider/volume-control-context';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Slider
} from '@opencord/ui';
import { Volume2, VolumeX } from 'lucide-react';
import { memo, useCallback } from 'react';

type TVolumeButtonProps = {
  volumeKey: TVolumeKey;
};

const VolumeButton = memo(({ volumeKey }: TVolumeButtonProps) => {
  const { getVolume, setVolume, toggleMute } = useVolumeControl();
  const volume = getVolume(volumeKey);
  const isMuted = volume === 0;

  const handleVolumeChange = useCallback(
    (values: number[]) => {
      setVolume(volumeKey, values[0] || 0);
    },
    [volumeKey, setVolume]
  );

  const handleToggleMute = useCallback(() => {
    toggleMute(volumeKey);
  }, [volumeKey, toggleMute]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          variant="ghost"
          icon={isMuted ? VolumeX : Volume2}
          title={isMuted ? 'Unmute' : 'Volume'}
          size="sm"
          className="rounded-lg border border-[#314055] bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
        />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="top"
        className="w-52 border border-[#314055] bg-[#182433] p-3 text-[#d7e2f0] shadow-[0_20px_48px_rgba(2,6,23,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <IconButton
            variant="ghost"
            icon={isMuted ? VolumeX : Volume2}
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            size="sm"
            className="rounded-lg border border-[#314055] bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
          />
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            min={0}
            max={100}
            step={1}
            className="flex-1 cursor-pointer"
          />
          <span className="w-8 text-right text-xs text-[#8fa2bb]">
            {volume}%
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
});

VolumeButton.displayName = 'VolumeButton';

export { VolumeButton };

