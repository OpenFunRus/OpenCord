import { Protect } from '@/components/protect';
import { UserAvatar } from '@/components/user-avatar';
import { useAdminUsers } from '@/features/server/admin/hooks';
import { useRoles } from '@/features/server/roles/hooks';
import { useDateLocale } from '@/hooks/use-date-locale';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  type TJoinedPublicUser,
  type TJoinedRole
} from '@opencord/shared';
import { Permission } from '@opencord/shared/src/statics/permissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconButton,
  Input,
  Tooltip
} from '@opencord/ui';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  ClipboardList,
  Clock,
  Eye,
  EyeClosed,
  Gavel,
  Globe,
  IdCard,
  Network,
  Plus,
  Shield,
  Trash2,
  Users
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useModViewContext } from '../context';

type TRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  details?: string;
  hidden?: boolean;
};

const normalizeIds = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b);

type TVisibilityAssignmentDialogProps = {
  isOpen: boolean;
  close: () => void;
  availableRoles: TJoinedRole[];
  availableUsers: TJoinedPublicUser[];
  onAssign: (selectedRoleIds: number[], selectedUserIds: number[]) => Promise<void>;
};

const VisibilityAssignmentDialog = memo(
  ({
    isOpen,
    close,
    availableRoles,
    availableUsers,
    onAssign
  }: TVisibilityAssignmentDialogProps) => {
    const { t } = useTranslation('settings');
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [roleQuery, setRoleQuery] = useState('');
    const [userQuery, setUserQuery] = useState('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
      if (!isOpen) return;

      setSelectedRoleIds([]);
      setSelectedUserIds([]);
      setRoleQuery('');
      setUserQuery('');
    }, [isOpen]);

    const filteredRoles = useMemo(() => {
      const query = roleQuery.trim().toLowerCase();

      return availableRoles.filter(
        (role) => !query || role.name.toLowerCase().includes(query)
      );
    }, [availableRoles, roleQuery]);

    const filteredUsers = useMemo(() => {
      const query = userQuery.trim().toLowerCase();

      return availableUsers.filter(
        (user) => !query || user.name.toLowerCase().includes(query)
      );
    }, [availableUsers, userQuery]);

    const toggleRole = useCallback((roleId: number) => {
      setSelectedRoleIds((current) =>
        current.includes(roleId)
          ? current.filter((value) => value !== roleId)
          : [...current, roleId]
      );
    }, []);

    const toggleUser = useCallback((userId: number) => {
      setSelectedUserIds((current) =>
        current.includes(userId)
          ? current.filter((value) => value !== userId)
          : [...current, userId]
      );
    }, []);

    const handleAssign = useCallback(async () => {
      if (selectedRoleIds.length === 0 && selectedUserIds.length === 0) {
        return;
      }

      setAssigning(true);

      try {
        await onAssign(selectedRoleIds, selectedUserIds);
        close();
      } finally {
        setAssigning(false);
      }
    }, [close, onAssign, selectedRoleIds, selectedUserIds]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-[min(720px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)]">
          <AlertDialogHeader className="border-b border-[#2b3544] bg-[#172231] px-5 py-4 text-left">
            <AlertDialogTitle className="text-lg font-semibold text-white">
              {t('userVisibilityDialogTitle')}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="grid gap-4 px-5 py-5 lg:grid-cols-2">
            <div className="space-y-3 rounded-sm border border-[#243140] bg-[#101926] p-3">
              <div className="text-sm font-medium text-white">
                {t('userVisibilityRolesLabel')}
              </div>
              <Input
                value={roleQuery}
                onChange={(event) => setRoleQuery(event.target.value)}
                placeholder={t('userVisibilityRolesSearchPlaceholder')}
                className="h-10 rounded-lg border-[#314055] bg-[#132033] text-[#d7e2f0] placeholder:text-[#8aa0bc] focus-visible:border-[#5f90d1] focus-visible:ring-[#5f90d1]/25"
              />
              <div className="grid max-h-72 gap-2 overflow-y-auto rounded-sm border border-[#2b3544] bg-[#0f1722] p-3">
                {filteredRoles.length === 0 && (
                  <div className="text-xs text-[#8fa2bb]">
                    {t('userVisibilityEmptyRoles')}
                  </div>
                )}
                {filteredRoles.map((role) => {
                  const checked = selectedRoleIds.includes(role.id);

                  return (
                    <label
                      key={role.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-2 transition-colors',
                        checked
                          ? 'border-[#4677b8] bg-[#1b2b40] text-white'
                          : 'border-[#314055] bg-[#0f1722] text-[#9fb2c8]'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role.id)}
                        className="h-4 w-4 accent-[#5f90d1]"
                      />
                      <span
                        className="inline-flex h-3 w-3 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="truncate">{role.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-sm border border-[#243140] bg-[#101926] p-3">
              <div className="text-sm font-medium text-white">
                {t('userVisibilityUsersLabel')}
              </div>
              <Input
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder={t('userVisibilityUsersSearchPlaceholder')}
                className="h-10 rounded-lg border-[#314055] bg-[#132033] text-[#d7e2f0] placeholder:text-[#8aa0bc] focus-visible:border-[#5f90d1] focus-visible:ring-[#5f90d1]/25"
              />
              <div className="grid max-h-72 gap-2 overflow-y-auto rounded-sm border border-[#2b3544] bg-[#0f1722] p-3">
                {filteredUsers.length === 0 && (
                  <div className="text-xs text-[#8fa2bb]">
                    {t('userVisibilityEmptyUsers')}
                  </div>
                )}
                {filteredUsers.map((candidate) => {
                  const checked = selectedUserIds.includes(candidate.id);

                  return (
                    <label
                      key={candidate.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-2 transition-colors',
                        checked
                          ? 'border-[#4677b8] bg-[#1b2b40] text-white'
                          : 'border-[#314055] bg-[#0f1722] text-[#9fb2c8]'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUser(candidate.id)}
                        className="h-4 w-4 accent-[#5f90d1]"
                      />
                      <UserAvatar userId={candidate.id} className="h-5 w-5" />
                      <span className="truncate">{candidate.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <AlertDialogFooter className="gap-2 border-t border-[#243140] bg-[#16212f] px-5 py-4">
            <AlertDialogCancel
              onClick={close}
              className="border-[#314055] bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
            >
              {t('cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={handleAssign}
                disabled={
                  assigning ||
                  (selectedRoleIds.length === 0 && selectedUserIds.length === 0)
                }
                className="rounded-sm border-[#4677b8] bg-[#2b5ea7] text-white hover:border-[#5f90d1] hover:bg-[#346cbd]"
              >
                {t('userVisibilityAssignBtn')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

const Row = memo(
  ({ icon, label, value, details, hidden = false }: TRowProps) => {
    const [visible, setVisible] = useState(!hidden);

    let valContent = (
      <span className="text-sm text-muted-foreground truncate max-w-[160px]">
        {visible ? value : '***'}
      </span>
    );

    if (details) {
      valContent = <Tooltip content={details}>{valContent}</Tooltip>;
    }

    return (
      <div className="flex items-center justify-between gap-4 rounded-sm border border-transparent px-3 py-3 transition-colors hover:border-[#314055] hover:bg-[#16212f]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon}
          <span className="text-sm truncate">{label}</span>
        </div>
        {valContent}
        {hidden && (
          <IconButton
            role="button"
            onClick={() => setVisible(!visible)}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border border-[#314055] bg-[#101926] text-[#8fa2bb] transition-colors hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white focus:outline-none"
            icon={visible ? EyeClosed : Eye}
          />
        )}
      </div>
    );
  }
);

const Details = memo(() => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const { user, logins, refetch } = useModViewContext();
  const { users: allUsers } = useAdminUsers();
  const roles = useRoles();
  const lastLogin = logins[0]; // TODO: in the future we might show a list of logins, atm we just show info about the last one
  const [canSeeUsersFromOwnRoles, setCanSeeUsersFromOwnRoles] = useState(
    user.canSeeUsersFromOwnRoles
  );
  const [visibleUserIds, setVisibleUserIds] = useState<number[]>(
    user.visibleUserIds ?? []
  );
  const [visibleRoleIds, setVisibleRoleIds] = useState<number[]>(
    user.visibleRoleIds ?? []
  );
  const [saving, setSaving] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  useEffect(() => {
    setCanSeeUsersFromOwnRoles(user.canSeeUsersFromOwnRoles);
    setVisibleUserIds(user.visibleUserIds ?? []);
    setVisibleRoleIds(user.visibleRoleIds ?? []);
  }, [
    user.canSeeUsersFromOwnRoles,
    user.id,
    user.visibleRoleIds,
    user.visibleUserIds
  ]);

  const persistVisibility = useCallback(async (
    nextCanSeeUsersFromOwnRoles: boolean,
    nextVisibleRoleIds: number[],
    nextVisibleUserIds: number[]
  ) => {
    const trpc = getTRPCClient();

    setSaving(true);

    try {
      await trpc.users.updateVisibility.mutate({
        userId: user.id,
        canSeeUsersFromOwnRoles: nextCanSeeUsersFromOwnRoles,
        visibleUserIds: normalizeIds(nextVisibleUserIds),
        visibleRoleIds: normalizeIds(nextVisibleRoleIds)
      });

      setCanSeeUsersFromOwnRoles(nextCanSeeUsersFromOwnRoles);
      setVisibleUserIds(normalizeIds(nextVisibleUserIds));
      setVisibleRoleIds(normalizeIds(nextVisibleRoleIds));
      toast.success(t('userVisibilitySaved'));
      await refetch();
      return true;
    } catch {
      toast.error(t('userVisibilitySaveFailed'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    refetch,
    t,
    user.id
  ]);

  const displayedRoleIds = useMemo(
    () =>
      normalizeIds([
        ...(canSeeUsersFromOwnRoles ? user.roleIds : []),
        ...visibleRoleIds
      ]),
    [canSeeUsersFromOwnRoles, user.roleIds, visibleRoleIds]
  );

  const displayedRoles = useMemo(
    () => roles.filter((role) => displayedRoleIds.includes(role.id)),
    [displayedRoleIds, roles]
  );

  const displayedUsers = useMemo(
    () =>
      allUsers.filter(
        (candidate) =>
          visibleUserIds.includes(candidate.id) &&
          candidate.name !== DELETED_USER_IDENTITY_AND_NAME
      ),
    [allUsers, visibleUserIds]
  );

  const availableRoles = useMemo(
    () => roles.filter((role) => !displayedRoleIds.includes(role.id)),
    [displayedRoleIds, roles]
  );

  const availableUsers = useMemo(
    () =>
      allUsers
        .filter(
          (candidate) =>
            candidate.id !== user.id &&
            candidate.name !== DELETED_USER_IDENTITY_AND_NAME &&
            !visibleUserIds.includes(candidate.id)
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
    [allUsers, user.id, visibleUserIds]
  );

  const handleRemoveUserVisibility = useCallback(
    async (userId: number) => {
      await persistVisibility(
        canSeeUsersFromOwnRoles,
        visibleRoleIds,
        visibleUserIds.filter((value) => value !== userId)
      );
    },
    [canSeeUsersFromOwnRoles, persistVisibility, visibleRoleIds, visibleUserIds]
  );

  const handleRemoveRoleVisibility = useCallback(
    async (roleId: number) => {
      if (canSeeUsersFromOwnRoles && user.roleIds.includes(roleId)) {
        await persistVisibility(
          false,
          displayedRoleIds.filter((value) => value !== roleId),
          visibleUserIds
        );
        return;
      }

      await persistVisibility(
        canSeeUsersFromOwnRoles,
        visibleRoleIds.filter((value) => value !== roleId),
        visibleUserIds
      );
    },
    [
      canSeeUsersFromOwnRoles,
      displayedRoleIds,
      persistVisibility,
      user.roleIds,
      visibleRoleIds,
      visibleUserIds
    ]
  );

  const handleAssignVisibility = useCallback(
    async (selectedRoleIds: number[], selectedUserIds: number[]) => {
      const nextVisibleRoleIds = canSeeUsersFromOwnRoles
        ? normalizeIds([
            ...visibleRoleIds,
            ...selectedRoleIds.filter((roleId) => !user.roleIds.includes(roleId))
          ])
        : normalizeIds([...visibleRoleIds, ...selectedRoleIds]);

      const nextVisibleUserIds = normalizeIds([
        ...visibleUserIds,
        ...selectedUserIds
      ]);

      await persistVisibility(
        canSeeUsersFromOwnRoles,
        nextVisibleRoleIds,
        nextVisibleUserIds
      );
    },
    [
      canSeeUsersFromOwnRoles,
      persistVisibility,
      user.roleIds,
      visibleRoleIds,
      visibleUserIds
    ]
  );

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-4">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#a8c9ff]" />
            {t('detailsTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4 py-4">
          <div className="space-y-2">
            <Row
              icon={<IdCard className="h-4 w-4 text-[#8fa2bb]" />}
              label={t('userIdLabel')}
              value={user.id}
            />

            <Protect permission={Permission.VIEW_USER_SENSITIVE_DATA}>
              <Row
                icon={<IdCard className="h-4 w-4 text-[#8fa2bb]" />}
                label={t('identityDetailLabel')}
                value={user.identity}
                hidden
              />

              <Row
                icon={<Network className="h-4 w-4 text-[#8fa2bb]" />}
                label={t('ipAddressLabel')}
                value={lastLogin?.ip || t('unknownValue')}
                hidden
              />

              <Row
                icon={<Globe className="h-4 w-4 text-[#8fa2bb]" />}
                label={t('locationLabel')}
                value={`${lastLogin?.country || t('naValue')} - ${lastLogin?.city || t('naValue')}`}
                hidden
              />
            </Protect>

            <Row
              icon={<Calendar className="h-4 w-4 text-[#8fa2bb]" />}
              label={t('joinedServerLabel')}
              value={formatDistanceToNow(user.createdAt, {
                addSuffix: true,
                locale: dateLocale
              })}
            />

            <Row
              icon={<Clock className="h-4 w-4 text-[#8fa2bb]" />}
              label={t('lastActiveLabel')}
              value={formatDistanceToNow(user.lastLoginAt, {
                addSuffix: true,
                locale: dateLocale
              })}
            />

            {user.banned && (
              <>
                <Row
                  icon={<Gavel className="h-4 w-4 text-[#ff9aa6]" />}
                  label={t('bannedDetailLabel')}
                  value={t('bannedDetailValue')}
                />

                <Row
                  icon={<Gavel className="h-4 w-4 text-[#ff9aa6]" />}
                  label={t('banReasonLabel')}
                  value={user.banReason || t('noReasonProvidedDetail')}
                />

                <Row
                  icon={<Gavel className="h-4 w-4 text-[#ff9aa6]" />}
                  label={t('bannedAtLabel')}
                  value={format(user.bannedAt ?? 0, 'PPP', {
                    locale: dateLocale
                  })}
                  details={format(user.bannedAt ?? 0, 'PPpp', {
                    locale: dateLocale
                  })}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#a8c9ff]" />
              {t('userVisibilityTitle')}
            </CardTitle>
            <Button
              onClick={() => setIsAssignDialogOpen(true)}
              disabled={
                saving ||
                (availableRoles.length === 0 && availableUsers.length === 0)
              }
              className="border-[#4677b8] bg-[#2b5ea7] text-white hover:border-[#5f90d1] hover:bg-[#346cbd]"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('userVisibilityAddBtn')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-5 pb-5 pt-4">
          <div className="rounded-sm border border-[#243140] bg-[#111a26] px-4 py-3 text-sm leading-6 text-[#8fa2bb]">
            {t('userVisibilityCustomHint')}
          </div>

          <div className="space-y-3 rounded-sm border border-[#243140] bg-[#111a26] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7c94]">
              {t('userVisibilityRolesLabel')}
            </div>
            {displayedRoles.length === 0 ? (
              <div className="rounded-sm border border-[#314055] bg-[#101926] px-3 py-3 text-sm text-[#8fa2bb]">
                {t('userVisibilityEmptyRoles')}
              </div>
            ) : (
              <div className="space-y-2">
                {displayedRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between gap-3 rounded-sm border border-[#314055] bg-[#101926] px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Shield className="h-4 w-4 text-[#8fa2bb]" />
                      <span
                        className="inline-flex h-3 w-3 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="truncate text-sm text-white">
                        {role.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRoleVisibility(role.id)}
                      disabled={saving}
                      className="shrink-0 bg-[#2b1218] text-[#ffb0bb] hover:border-[#7a3340] hover:bg-[#3a1d26] hover:text-[#ffd1d8]"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('userVisibilityRemoveBtn')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-sm border border-[#243140] bg-[#111a26] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6b7c94]">
              {t('userVisibilityUsersLabel')}
            </div>
            {displayedUsers.length === 0 ? (
              <div className="rounded-sm border border-[#314055] bg-[#101926] px-3 py-3 text-sm text-[#8fa2bb]">
                {t('userVisibilityEmptyUsers')}
              </div>
            ) : (
              <div className="space-y-2">
                {displayedUsers.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between gap-3 rounded-sm border border-[#314055] bg-[#101926] px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Users className="h-4 w-4 text-[#8fa2bb]" />
                      <UserAvatar userId={candidate.id} className="h-6 w-6" />
                      <span className="truncate text-sm text-white">
                        {candidate.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUserVisibility(candidate.id)}
                      disabled={saving}
                      className="shrink-0 bg-[#2b1218] text-[#ffb0bb] hover:border-[#7a3340] hover:bg-[#3a1d26] hover:text-[#ffd1d8]"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('userVisibilityRemoveBtn')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <VisibilityAssignmentDialog
        isOpen={isAssignDialogOpen}
        close={() => setIsAssignDialogOpen(false)}
        availableRoles={availableRoles}
        availableUsers={availableUsers}
        onAssign={handleAssignVisibility}
      />
    </div>
  );
});

export { Details };

