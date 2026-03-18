import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { connect } from '@/features/server/actions';
import { useInfo } from '@/features/server/hooks';
import { getFileUrl, getUrlFromServer } from '@/helpers/get-file-url';
import {
  getLocalStorageItem,
  getLocalStorageItemBool,
  LocalStorageKey,
  removeLocalStorageItem,
  SessionStorageKey,
  setLocalStorageItem,
  setLocalStorageItemBool,
  setSessionStorageItem
} from '@/helpers/storage';
import { useForm } from '@/hooks/use-form';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { PluginSlot, TestId } from '@opencord/shared';
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertTitle,
  AutoFocus,
  Button,
  Card,
  CardContent,
  Input,
  cn
} from '@opencord/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
type TLoginResponse = { token: string };
type TLoginErrors = Partial<Record<'identity' | 'password' | 'name', string>>;
const DISPLAY_NAME_REQUIRED_ERROR = 'Display name is required';

const FlagIcon = memo(({ language }: { language: TLanguageCode }) => {
  if (language === 'ru') {
    return (
      <span className="relative block h-4 w-6 overflow-hidden rounded-[4px] border border-white/10 bg-white shadow-inner ring-1 ring-black/10">
        <span className="absolute inset-x-0 top-1/3 h-1/3 bg-[#1f5eff]" />
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-[#e5484d]" />
      </span>
    );
  }

  return (
    <span className="relative block h-4 w-6 overflow-hidden rounded-[4px] border border-white/10 bg-[repeating-linear-gradient(to_bottom,#b91c1c_0,#b91c1c_7.69%,#ffffff_7.69%,#ffffff_15.38%)] shadow-inner ring-1 ring-black/10">
      <span className="absolute left-0 top-0 h-[53.85%] w-[45%] bg-[#1d4ed8]" />
      <span className="absolute left-[4%] top-[8%] text-[3px] leading-[1] text-white">
        * * *
      </span>
      <span className="absolute left-[4%] top-[28%] text-[3px] leading-[1] text-white">
        * * *
      </span>
      <span className="absolute left-[4%] top-[48%] text-[3px] leading-[1] text-white">
        * * *
      </span>
    </span>
  );
});

const Connect = memo(() => {
  const { t, i18n } = useTranslation(['connect', 'common']);
  const { values, errors, r, setErrors, onChange } = useForm<{
    identity: string;
    password: string;
    autoLogin: boolean;
    serverName: string;
  }>({
    identity: getLocalStorageItem(LocalStorageKey.IDENTITY) || '',
    password: getLocalStorageItem(LocalStorageKey.USER_PASSWORD) || '',
    autoLogin: getLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, true),
    serverName: ''
  });

  const [loading, setLoading] = useState(false);
  const [isServerNameDialogOpen, setIsServerNameDialogOpen] = useState(false);
  const info = useInfo();

  const inviteCode = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invite = urlParams.get('invite');
    return invite || undefined;
  }, []);

  const applyLoginErrors = useCallback(
    (loginErrors: TLoginErrors = {}) => {
      setErrors({
        identity: loginErrors.identity,
        password: loginErrors.password,
        serverName:
          loginErrors.name === DISPLAY_NAME_REQUIRED_ERROR
            ? t('serverNameRequired')
            : loginErrors.name
      });

      if (loginErrors.name) {
        setIsServerNameDialogOpen(true);
      }
    },
    [setErrors, t]
  );

  const onConnectClick = useCallback(async () => {
    setLoading(true);

    try {
      const url = getUrlFromServer();
      const trimmedServerName = values.serverName.trim();
      const response = await fetch(`${url}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity: values.identity,
          password: values.password,
          invite: inviteCode,
          autoLogin: values.autoLogin || undefined,
          name: trimmedServerName || undefined
        })
      });

      if (!response.ok) {
        const data = (await response.json()) as { errors?: TLoginErrors };

        applyLoginErrors(data.errors);
        return;
      }

      const data = (await response.json()) as TLoginResponse;
      const trimmedIdentity = values.identity.trim();

      setSessionStorageItem(SessionStorageKey.TOKEN, data.token);
      setLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, values.autoLogin);
      setIsServerNameDialogOpen(false);
      onChange('serverName', '');

      if (values.autoLogin) {
        setLocalStorageItem(LocalStorageKey.IDENTITY, trimmedIdentity);
        setLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN, data.token);
      } else {
        removeLocalStorageItem(LocalStorageKey.IDENTITY);
        removeLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);
      }

      await connect();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      toast.error(t('connectError', { message: errorMessage }));
    } finally {
      setLoading(false);
    }
  }, [
    values.identity,
    values.password,
    values.autoLogin,
    values.serverName,
    applyLoginErrors,
    inviteCode,
    onChange,
    t
  ]);

  const logoSrc = useMemo(() => {
    if (info?.logo) {
      return getFileUrl(info.logo);
    }

    return '/logo.webp';
  }, [info]);

  const currentLanguage = (i18n.resolvedLanguage ??
    i18n.language) as TLanguageCode;

  const onLanguageChange = useCallback(
    (language: TLanguageCode) => {
      i18n.changeLanguage(language);
    },
    [i18n]
  );

  return (
    <div className="relative h-full w-full overflow-x-hidden overflow-y-auto bg-[#0b1220] touch-pan-y">
      <AlertDialog open={isServerNameDialogOpen}>
        <AlertDialogContent className="border-[#2b3544] bg-[#182433] text-white shadow-[0_30px_80px_rgba(3,8,20,0.55)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {t('serverNameDialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#aab8cb]">
              {t('serverNameDialogDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AutoFocus>
            <Input
              value={values.serverName}
              onChange={(e) => onChange('serverName', e.target.value)}
              onEnter={onConnectClick}
              error={errors.serverName}
              autoComplete="nickname"
              placeholder={t('serverNamePlaceholder')}
              className="h-12 rounded-lg border-[#314055] bg-[#101926] text-white placeholder:text-[#6e819a] focus-visible:border-[#206bc4] focus-visible:ring-[#206bc4]/30"
            />
          </AutoFocus>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={onConnectClick}
              disabled={loading || !values.serverName.trim()}
              className="h-12 rounded-lg border border-[#2f7ad1] bg-[#206bc4] text-sm font-semibold text-white hover:bg-[#1b5dab]"
            >
              {t('serverNameConfirmBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(32,107,196,0.18),transparent_32%),radial-gradient(circle_at_bottom,rgba(26,37,57,0.9),transparent_42%)]" />
      <div className="relative flex min-h-full items-start justify-center px-3 py-4 sm:px-6 sm:py-8">
        <div className="w-full max-w-md">
          <Card className="overflow-hidden rounded-2xl border-[#2b3544] bg-[#182433] py-0 text-white shadow-[0_30px_80px_rgba(3,8,20,0.5)]">
            <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <img
                  src={logoSrc}
                  alt="OpenCord"
                  className="block max-h-28 max-w-full sm:max-h-32"
                />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white">
                  {t('common:appName')}
                </h1>
              </div>

              <div className="flex items-center justify-center gap-2">
                {SUPPORTED_LANGUAGES.map((language) => {
                  const isActive = currentLanguage === language.code;

                  return (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => onLanguageChange(language.code)}
                      className={cn(
                        'inline-flex min-w-20 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-all',
                        isActive
                          ? 'border-[#206bc4] bg-[#206bc4] text-white shadow-[0_10px_30px_rgba(32,107,196,0.35)]'
                          : 'border-[#314055] bg-[#101926] text-[#aab8cb] hover:border-[#3d516b] hover:bg-[#162132] hover:text-white'
                      )}
                      aria-pressed={isActive}
                    >
                      <FlagIcon language={language.code} />
                      <span>{language.code.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>

              <PluginSlotRenderer slotId={PluginSlot.CONNECT_SCREEN} />
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                onConnectClick();
              }}
            >
              <div className="space-y-2">
                <label
                  htmlFor="connect-identity"
                  className="block text-sm font-semibold text-[#d7e2f0]"
                >
                  {t('identityLabel')}
                </label>
                <Input
                  id="connect-identity"
                  {...r('identity')}
                  autoComplete="username"
                  data-testid={TestId.CONNECT_IDENTITY_INPUT}
                  className="h-12 rounded-lg border-[#314055] bg-[#101926] text-white placeholder:text-[#6e819a] focus-visible:border-[#206bc4] focus-visible:ring-[#206bc4]/30"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="connect-password"
                  className="block text-sm font-semibold text-[#d7e2f0]"
                >
                  {t('passwordLabel')}
                </label>
                <Input
                  id="connect-password"
                  {...r('password')}
                  type="password"
                  autoComplete="current-password"
                  onEnter={onConnectClick}
                  data-testid={TestId.CONNECT_PASSWORD_INPUT}
                  className="h-12 rounded-lg border-[#314055] bg-[#101926] text-white placeholder:text-[#6e819a] focus-visible:border-[#206bc4] focus-visible:ring-[#206bc4]/30"
                />
              </div>

              <label
                className="flex items-center gap-3 rounded-lg border border-[#2b3544] bg-[#101926]/85 px-3.5 py-3 text-sm text-[#d7e2f0]"
                data-testid={TestId.CONNECT_AUTO_LOGIN_SWITCH}
              >
                <input
                  type="checkbox"
                  checked={values.autoLogin}
                  onChange={(e) => onChange('autoLogin', e.target.checked)}
                  className="size-4 rounded border-[#3b4b61] bg-[#101926] accent-[#206bc4]"
                />
                <span className="font-medium">{t('autoLoginLabel')}</span>
              </label>

              <Button
                className="h-12 w-full rounded-lg border border-[#2f7ad1] bg-[#206bc4] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(32,107,196,0.35)] hover:bg-[#1b5dab] disabled:border-[#314055] disabled:bg-[#223146] disabled:text-[#7f91a8]"
                onClick={onConnectClick}
                disabled={loading || !values.identity || !values.password}
                data-testid={TestId.CONNECT_BUTTON}
              >
                {t('connectBtn')}
              </Button>

              {!window.isSecureContext && (
                <Alert
                  className="border-[#73423b] bg-[#2f1b18] text-[#ffd8d2]"
                  variant="destructive"
                >
                  <AlertTitle className="text-[#ffd8d2]">
                    {t('insecureTitle')}
                  </AlertTitle>
                  <AlertDescription className="text-[#f0beb6]">
                    {t('insecureDesc')}
                  </AlertDescription>
                </Alert>
              )}

              {!info?.allowNewUsers && !inviteCode && (
                <span className="block text-center text-xs leading-5 text-[#8fa2bb]">
                  {t('registrationDisabled')}
                </span>
              )}

              {inviteCode && (
                <Alert
                  className="border-[#2b4b6f] bg-[#152739] text-[#d7e8ff]"
                  variant="info"
                >
                  <AlertTitle className="text-[#d7e8ff]">
                    {t('invitedTitle')}
                  </AlertTitle>
                  <AlertDescription className="text-[#b7c9df]">
                    <span className="font-mono text-xs">
                      {t('inviteCode', { code: inviteCode })}
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

export { Connect };

