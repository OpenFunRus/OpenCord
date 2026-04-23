import { requestConfirmation } from '@/features/dialogs/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { disconnectFromServer } from '@/features/server/actions';
import { cn } from '@/lib/utils';
import { Permission } from '@opencord/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@opencord/ui';
import { Settings } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Protect } from '../protect';
import { ServerScreen } from '../server-screens/screens';

type TServerDropdownMenuProps = {
  className?: string;
};

const ServerDropdownMenu = memo(({ className }: TServerDropdownMenuProps) => {
  const { t } = useTranslation('sidebar');
  const serverSettingsPermissions = useMemo(
    () => [
      Permission.MANAGE_SETTINGS,
      Permission.MANAGE_SPACES,
      Permission.MANAGE_ROLES,
      Permission.MANAGE_STORAGE,
      Permission.MANAGE_USERS,
      Permission.MANAGE_INVITES,
      Permission.MANAGE_UPDATES
    ],
    []
  );

  const handleDisconnectClick = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: t('disconnectConfirmTitle'),
      message: t('disconnectConfirmMsg'),
      confirmLabel: t('disconnect')
    });

    if (confirmed) {
      disconnectFromServer();
    }
  }, [t]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={t('serverSettings')}
          className={cn(
            'h-8 w-8 rounded-lg border border-[#314055] !bg-[#172231] text-[#8fa2bb] hover:!bg-[#1b2940] hover:border-[#3d516b] hover:text-white',
            className
          )}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="border-[#314055] bg-[#172231] text-[#d7e2f0] shadow-[0_20px_48px_rgba(2,6,23,0.45)]">
        <DropdownMenuLabel className="text-white">{t('server')}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#314055]" />
        <Protect permission={serverSettingsPermissions}>
          <DropdownMenuItem
            onClick={() => openServerScreen(ServerScreen.SERVER_SETTINGS)}
            className="text-[#8fa2bb] focus:bg-[#1b2940] focus:text-white"
          >
            {t('serverSettings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#314055]" />
        </Protect>
        <DropdownMenuItem
          onClick={handleDisconnectClick}
          className="text-destructive focus:bg-red-500/10 focus:text-destructive"
        >
          {t('disconnect')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export { ServerDropdownMenu };

