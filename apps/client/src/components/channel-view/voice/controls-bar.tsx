import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useOwnVoiceState, useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission } from '@opencord/shared';
import { Button, Tooltip } from '@opencord/ui';
import {
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  ScreenShareOff,
  Video,
  VideoOff
} from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ControlToggleButton } from './control-toggle-button';
import { useControlsBarVisibility } from './hooks/use-controls-bar-visibility';

type TControlsBarProps = {
  channelId: number;
};

const ControlsBar = memo(({ channelId }: TControlsBarProps) => {
  const { t } = useTranslation(['sidebar', 'common']);
  const { toggleMic, toggleWebcam, toggleScreenShare } = useVoice();
  const ownVoiceState = useOwnVoiceState();
  const channelCan = useChannelCan(channelId);
  const isVisible = useControlsBarVisibility();

  const permissions = useMemo(
    () => ({
      canSpeak: channelCan(ChannelPermission.SPEAK),
      canWebcam: channelCan(ChannelPermission.WEBCAM),
      canShareScreen: channelCan(ChannelPermission.SHARE_SCREEN)
    }),
    [channelCan]
  );

  return (
    <div
      className={cn(
        'absolute bottom-8 left-0 right-0 hidden md:flex justify-center items-center pointer-events-none',
        'transition-all duration-300 ease-in-out gap-3',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 pointer-events-auto',
          'h-14 rounded-xl border border-[#314055] bg-[#172231]/96 px-2 shadow-[0_18px_42px_rgba(2,6,23,0.38)] backdrop-blur-md'
        )}
      >
        <ControlToggleButton
          enabled={ownVoiceState.micMuted}
          enabledLabel={t('sidebar:unmute')}
          disabledLabel={t('sidebar:mute')}
          enabledIcon={MicOff}
          disabledIcon={Mic}
          enabledClassName="border-[#7a3340] !bg-[#3a1d26] text-[#ff8b9a] hover:border-[#9f4353] hover:!bg-[#4a222e] hover:text-[#ffb0bb]"
          onClick={toggleMic}
          disabled={!permissions.canSpeak}
        />

        <ControlToggleButton
          enabled={ownVoiceState.webcamEnabled}
          enabledLabel={t('sidebar:stopVideo')}
          disabledLabel={t('sidebar:startVideo')}
          enabledIcon={Video}
          disabledIcon={VideoOff}
          enabledClassName="border-[#2f6b5a] !bg-[#162d29] text-[#76d7b6] hover:border-[#3e8d77] hover:!bg-[#1b3933] hover:text-[#a7eed3]"
          onClick={toggleWebcam}
          disabled={!permissions.canWebcam}
        />

        <ControlToggleButton
          enabled={ownVoiceState.sharingScreen}
          enabledLabel={t('sidebar:stopSharing')}
          disabledLabel={t('sidebar:shareScreenAction')}
          enabledIcon={ScreenShareOff}
          disabledIcon={Monitor}
          enabledClassName="border-[#335d97] !bg-[#16253a] text-[#73a7ff] hover:border-[#4677b8] hover:!bg-[#1c2e48] hover:text-[#a8c9ff]"
          onClick={toggleScreenShare}
          disabled={!permissions.canShareScreen}
        />
      </div>

      <Tooltip content={t('sidebar:disconnectVoice')}>
        <Button
          size="icon"
          className={cn(
            'pointer-events-auto h-14 w-18 rounded-xl border border-[#a9485a] text-white shadow-[0_18px_42px_rgba(2,6,23,0.38)] transition-all active:scale-95',
            '!bg-[#7d2d3a] hover:!bg-[#933445]'
          )}
          onClick={leaveVoice}
          aria-label={t('sidebar:disconnectVoice')}
        >
          <PhoneOff size={24} fill="currentColor" />
        </Button>
      </Tooltip>
    </div>
  );
});

export { ControlsBar };

