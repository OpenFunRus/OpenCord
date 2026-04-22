import {
  MESSAGE_DEFAULT_LINES_LIMIT,
  MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT,
  Permission,
  STORAGE_DEFAULT_MAX_AVATAR_SIZE,
  STORAGE_DEFAULT_MAX_BANNER_SIZE,
  STORAGE_DEFAULT_MAX_FILES_PER_MESSAGE,
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MIN_QUOTA_PER_USER,
  STORAGE_OVERFLOW_ACTION,
  STORAGE_QUOTA,
  type TIRole,
  type TISettings
} from '@opencord/shared';
import { randomUUIDv7 } from 'bun';
import { logger } from '../logger';
import { db } from './index';
import { rolePermissions, roles, settings } from './schema';

const seedDatabase = async () => {
  const needsSeeding = (await db.select().from(settings)).length === 0;

  if (!needsSeeding) return;

  logger.debug('Seeding initial database values...');

  const firstStart = Date.now();

  const initialSettings: TISettings = {
    name: 'OpenCord',
    description: 'Приватный сервер OpenCord',
    password: '',
    serverId: Bun.randomUUIDv7(),
    secretToken: await Bun.password.hash(randomUUIDv7()),
    allowNewUsers: true,
    directMessagesEnabled: true,
    storageUploadEnabled: true,
    storageQuota: STORAGE_QUOTA,
    storageUploadMaxFileSize: STORAGE_MAX_FILE_SIZE,
    storageMaxAvatarSize: STORAGE_DEFAULT_MAX_AVATAR_SIZE,
    storageMaxBannerSize: STORAGE_DEFAULT_MAX_BANNER_SIZE,
    storageMaxFilesPerMessage: STORAGE_DEFAULT_MAX_FILES_PER_MESSAGE,
    storageFileSharingInDirectMessages: true,
    storageSpaceQuotaByUser: STORAGE_MIN_QUOTA_PER_USER,
    storageOverflowAction: STORAGE_OVERFLOW_ACTION,
    enablePlugins: false,
    enableSearch: true,
    messageMaxTextLength: MESSAGE_DEFAULT_TEXT_LENGTH_LIMIT,
    messageMaxLines: MESSAGE_DEFAULT_LINES_LIMIT
  };

  await db.insert(settings).values(initialSettings);

  const initialRoles: TIRole[] = [
    {
      name: 'Создатель',
      color: '#ff0000',
      isDefault: false,
      isPersistent: true,
      createdAt: firstStart
    },
    {
      name: 'Гость',
      color: '#ffff00',
      isPersistent: true,
      isDefault: true,
      createdAt: firstStart
    }
  ];

  const initialRolePermissions: {
    [roleId: number]: Permission[];
  } = {
    1: Object.values(Permission), // Owner (all permissions)
    2: [
      Permission.SEND_MESSAGES,
      Permission.JOIN_VOICE_CHANNELS,
      Permission.SHARE_SCREEN,
      Permission.ENABLE_WEBCAM,
      Permission.UPLOAD_FILES
    ]
  };

  await db.insert(roles).values(initialRoles);

  for (const [roleId, permissions] of Object.entries(initialRolePermissions)) {
    for (const permission of permissions) {
      await db.insert(rolePermissions).values({
        roleId: Number(roleId),
        permission,
        createdAt: Date.now()
      });
    }
  }
};

export { seedDatabase };

