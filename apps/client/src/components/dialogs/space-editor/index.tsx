import { SpaceAvatar } from '@/components/space-avatar';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useRoles } from '@/features/server/roles/hooks';
import { useSpaceById } from '@/features/server/spaces/hooks';
import { uploadFile } from '@/helpers/upload-file';
import { getFileUrl } from '@/helpers/get-file-url';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Group,
  Input
} from '@opencord/ui';
import { Trash2, Upload } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TSpaceEditorDialogProps = TDialogBaseProps & {
  spaceId?: number;
};

const SpaceEditorDialog = memo(
  ({ isOpen, close, spaceId }: TSpaceEditorDialogProps) => {
    const { t } = useTranslation(['dialogs', 'sidebar', 'common']);
    const space = useSpaceById(spaceId ?? -1);
    const roles = useRoles();
    const openFilePicker = useFilePicker();
    const [name, setName] = useState('');
    const [avatarFileId, setAvatarFileId] = useState<string | undefined>(undefined);
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const isEditing = Boolean(spaceId);

    useEffect(() => {
      if (isEditing && space) {
        setName(space.name);
        setAvatarFileId(undefined);
        setAvatarUrl(space.avatar ? getFileUrl(space.avatar) : undefined);
        setSelectedRoleIds(space.roleIds);
        return;
      }

      setName(t('sidebar:guestSpaceName'));
      setAvatarFileId(undefined);
      setAvatarUrl(undefined);
      setSelectedRoleIds([]);
    }, [isEditing, space, t]);

    const toggleRole = useCallback((roleId: number) => {
      setSelectedRoleIds((prev) =>
        prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
      );
    }, []);

    const handleUploadAvatar = useCallback(async () => {
      try {
        const [file] = await openFilePicker('image/*');

        if (!file) return;

        const tempFile = await uploadFile(file);

        if (!tempFile) {
          return;
        }

        setAvatarFileId(tempFile.id);
        setAvatarUrl(URL.createObjectURL(file));
      } catch {
        toast.error(t('dialogs:spaceAvatarUploadFailed'));
      }
    }, [openFilePicker, t]);

    const handleSave = useCallback(async () => {
      const trpc = getTRPCClient();

      setLoading(true);

      try {
        if (isEditing && spaceId) {
          await trpc.spaces.update.mutate({
            spaceId,
            name,
            avatarFileId,
            roleIds: selectedRoleIds
          });
        } else {
          await trpc.spaces.add.mutate({
            name,
            avatarFileId,
            roleIds: selectedRoleIds
          });
        }

        close();
      } catch {
        toast.error(t('dialogs:spaceSaveFailed'));
      } finally {
        setLoading(false);
      }
    }, [avatarFileId, close, isEditing, name, selectedRoleIds, spaceId, t]);

    const handleDelete = useCallback(async () => {
      if (!spaceId || !space || space.isDefault) {
        return;
      }

      const confirmed = await requestConfirmation({
        title: t('dialogs:deleteSpaceTitle'),
        message: t('dialogs:deleteSpaceMessage', { name: space.name }),
        confirmLabel: t('sidebar:deleteLabel'),
        cancelLabel: t('common:cancel'),
        variant: 'danger'
      });

      if (!confirmed) {
        return;
      }

      const trpc = getTRPCClient();

      try {
        await trpc.spaces.delete.mutate({ spaceId });
        close();
      } catch {
        toast.error(t('dialogs:spaceDeleteFailed'));
      }
    }, [close, space, spaceId, t]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          close={close}
          overlayClassName="bg-[#0b1220]/70 backdrop-blur-sm"
          closeClassName="top-4 right-4 h-9 w-9 rounded-lg border border-[#314055] !bg-[#101926] p-0 text-[#8fa2bb] opacity-100 shadow-none hover:border-[#3d516b] hover:!bg-[#1b2940] hover:text-white data-[state=open]:!bg-[#101926] data-[state=open]:text-[#8fa2bb]"
          className="w-[min(620px,calc(100vw-2rem))] max-w-[min(620px,calc(100vw-2rem))] overflow-hidden rounded-[12px] border border-[#2b3544] bg-[#182433] p-0 text-[#d7e2f0] shadow-[0_24px_64px_rgba(2,6,23,0.5)] [&_.text-muted-foreground]:text-[#8fa2bb] [&_[data-slot=button]]:rounded-sm [&_[data-slot=button]]:border [&_[data-slot=button]]:border-[#314055] [&_[data-slot=button]]:shadow-none [&_[data-slot=input]]:rounded-sm [&_[data-slot=input]]:border-[#314055] [&_[data-slot=input]]:bg-[#0f1722] [&_[data-slot=input]]:text-[#d7e2f0] [&_[data-slot=input]]:placeholder:text-[#6f839b] [&_[data-slot=input]:focus-visible]:border-[#4677b8] [&_[data-slot=input]:focus-visible]:ring-2 [&_[data-slot=input]:focus-visible]:ring-[#4677b8]/25"
        >
          <DialogHeader className="border-b border-[#2b3544] bg-[#172231] px-5 py-4 text-left">
            <DialogTitle className="text-lg font-semibold text-white">
              {isEditing ? t('dialogs:editSpaceTitle') : t('dialogs:createSpaceTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-5 py-5">
            <Group label={t('dialogs:spaceAvatarLabel')}>
              <button
                type="button"
                className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#314055] bg-[#101926] text-xl font-semibold text-white"
                onClick={handleUploadAvatar}
              >
                <SpaceAvatar
                  name={name || t('sidebar:guestSpaceName')}
                  src={avatarUrl}
                  className="h-24 w-24"
                />
                <div className="absolute inset-0 hidden items-center justify-center bg-black/50 group-hover:flex">
                  <Upload className="h-5 w-5 text-white" />
                </div>
              </button>
            </Group>

            <Group label={t('dialogs:spaceNameLabel')}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('dialogs:spaceNamePlaceholder')}
              />
            </Group>

            <Group label={t('dialogs:spaceRolesLabel')}>
              <div className="grid max-h-56 gap-2 overflow-y-auto rounded-sm border border-[#2b3544] bg-[#101926] p-3">
                {roles.map((role) => {
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
                        className="h-4 w-4"
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
              <p className="text-xs text-[#8fa2bb]">
                {t('dialogs:spaceRolesHint')}
              </p>
            </Group>
          </div>

          <DialogFooter className="justify-between gap-2 border-t border-[#243140] bg-[#16212f] px-5 py-4">
            <div>
              {isEditing && !space?.isDefault && (
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  className="bg-[#2b1218] text-[#ffb0bb] hover:border-[#7a3340] hover:bg-[#3a1d26] hover:text-[#ffd1d8]"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('sidebar:deleteLabel')}
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={close}
                className="bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
              >
                {t('common:cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !name.trim()}
                className="border-[#4677b8] bg-[#2b5ea7] text-white hover:border-[#5f90d1] hover:bg-[#346cbd]"
              >
                {isEditing ? t('common:saveChanges') : t('dialogs:createSpaceBtn')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { SpaceEditorDialog };
