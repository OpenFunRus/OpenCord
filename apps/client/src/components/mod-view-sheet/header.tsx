import { SpaceAvatar } from '@/components/space-avatar';
import { UserAvatar } from '@/components/user-avatar';
import { setModViewOpen } from '@/features/app/actions';
import {
  openDialog,
  requestConfirmation,
  requestTextInput
} from '@/features/dialogs/actions';
import { useUserRoles } from '@/features/server/hooks';
import { useSpaces } from '@/features/server/spaces/hooks';
import { useOwnUserId, useUserStatus } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  canUserAccessSpace,
  DELETED_USER_IDENTITY_AND_NAME,
  getTrpcError,
  OWNER_ROLE_ID,
  UserStatus
} from '@opencord/shared';
import { Button } from '@opencord/ui';
import { Gavel, Plus, Trash, UserMinus } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog } from '../dialogs/dialogs';
import { RoleBadge } from '../role-badge';
import { useModViewContext } from './context';

const Header = memo(() => {
  const { t } = useTranslation('settings');
  const ownUserId = useOwnUserId();
  const { user, refetch } = useModViewContext();
  const status = useUserStatus(user.id);
  const userRoles = useUserRoles(user.id);
  const spaces = useSpaces();
  const isDeletedUser = user.identity === DELETED_USER_IDENTITY_AND_NAME;
  const isOwnUser = user.id === ownUserId;

  const accessibleSpaces = useMemo(() => {
    const roleIds = user.roleIds ?? [];

    if (roleIds.includes(OWNER_ROLE_ID)) {
      return [...spaces].sort((a, b) => a.position - b.position || a.id - b.id);
    }

    return spaces
      .filter((space) => canUserAccessSpace(user.id, roleIds, space))
      .sort((a, b) => a.position - b.position || a.id - b.id);
  }, [spaces, user.id, user.roleIds]);

  const onRemoveRole = useCallback(
    async (roleId: number, roleName: string) => {
      const answer = await requestConfirmation({
        title: t('removeRoleTitle'),
        message: t('removeRoleMsg', { roleName }),
        confirmLabel: t('removeRoleConfirm')
      });

      if (!answer) {
        return;
      }

      const trpc = getTRPCClient();

      try {
        await trpc.users.removeRole.mutate({
          userId: user.id,
          roleId
        });
        toast.success(t('roleRemovedSuccess'));
      } catch (error) {
        toast.error(getTrpcError(error, t('failedRemoveRole')));
      } finally {
        refetch();
      }
    },
    [user.id, refetch, t]
  );

  const onKick = useCallback(async () => {
    const reason = await requestTextInput({
      title: t('kickTitle'),
      message: t('kickMsg'),
      confirmLabel: t('kickConfirm'),
      allowEmpty: true
    });

    if (reason === null) {
      return;
    }

    const trpc = getTRPCClient();

    try {
      await trpc.users.kick.mutate({
        userId: user.id,
        reason
      });
      toast.success(t('kickedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedKick')));
    } finally {
      refetch();
    }
  }, [user.id, refetch, t]);

  const onBan = useCallback(async () => {
    if (isDeletedUser) {
      toast.error(t('cannotBanDeletedUser'));
      return;
    }

    const trpc = getTRPCClient();

    const reason = await requestTextInput({
      title: t('banTitle'),
      message: t('banMsg'),
      confirmLabel: t('banConfirm'),
      allowEmpty: true
    });

    if (reason === null) {
      return;
    }

    try {
      await trpc.users.ban.mutate({
        userId: user.id,
        reason
      });
      toast.success(t('bannedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedBan')));
    } finally {
      refetch();
    }
  }, [user.id, refetch, isDeletedUser, t]);

  const onUnban = useCallback(async () => {
    if (isDeletedUser) {
      toast.error(t('cannotBanDeletedUser'));
      return;
    }

    const trpc = getTRPCClient();

    const answer = await requestConfirmation({
      title: t('unbanTitle'),
      message: t('unbanMsg'),
      confirmLabel: t('unbanConfirm')
    });

    if (!answer) {
      return;
    }

    try {
      await trpc.users.unban.mutate({
        userId: user.id
      });
      toast.success(t('unbannedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedUnban')));
    } finally {
      refetch();
    }
  }, [user.id, refetch, isDeletedUser, t]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar userId={user.id} className="h-12 w-12" />
        <h2 className="text-lg font-bold text-foreground">{user.name}</h2>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
          onClick={onKick}
          disabled={status === UserStatus.OFFLINE}
        >
          <UserMinus className="h-4 w-4" />
          {t('kickBtn')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-[#101926] text-[#8fa2bb] hover:border-[#7a3340] hover:bg-[#3a1d26] hover:text-[#ffb0bb]"
          onClick={() => (user.banned ? onUnban() : onBan())}
          disabled={isOwnUser || isDeletedUser}
        >
          <Gavel className="h-4 w-4" />
          {user.banned ? t('unbanBtn') : t('banBtn')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-[#101926] text-[#8fa2bb] hover:border-[#7a3340] hover:bg-[#3a1d26] hover:text-[#ffb0bb]"
          onClick={() =>
            openDialog(Dialog.DELETE_USER, {
              user,
              refetch,
              onDelete: () => setModViewOpen(false)
            })
          }
          disabled={isOwnUser || isDeletedUser}
        >
          <Trash className="h-4 w-4" />
          {t('deleteBtn')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        {userRoles.map((role) => (
          <RoleBadge key={role.id} role={role} onRemoveRole={onRemoveRole} />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-6 bg-[#101926] px-2 text-xs text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
          disabled={isDeletedUser}
          onClick={() => openDialog(Dialog.ASSIGN_ROLE, { user, refetch })}
        >
          <Plus className="h-3 w-3" />
          {t('modViewAssignRoleBtn')}
        </Button>
      </div>

      <div className="rounded-sm border border-[#243140] bg-[#101926] p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7c94]">
          {t('modViewAccessibleSpacesTitle')}
        </div>
        {accessibleSpaces.length === 0 ? (
          <div className="mt-2 text-xs text-[#8fa2bb]">{t('modViewAccessibleSpacesEmpty')}</div>
        ) : (
          <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
            {accessibleSpaces.map((space) => (
              <li
                key={space.id}
                className="flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-sm text-[#d7e2f0]"
              >
                <SpaceAvatar name={space.name} avatar={space.avatar} className="h-7 w-7 shrink-0" />
                <span className="truncate">{space.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

export { Header };

