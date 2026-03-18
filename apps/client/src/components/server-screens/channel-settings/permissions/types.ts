import type { ChannelPermission } from '@opencord/shared';

export type TChannelPermission = {
  permission: ChannelPermission;
  allow: boolean;
};

export type TChannelPermissionType = 'role' | 'user';

