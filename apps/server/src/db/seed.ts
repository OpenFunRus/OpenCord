import {
  ChannelType,
  DEFAULT_ROLE_PERMISSIONS,
  Permission,
  STORAGE_DEFAULT_MAX_AVATAR_SIZE,
  STORAGE_DEFAULT_MAX_BANNER_SIZE,
  STORAGE_DEFAULT_MAX_FILES_PER_MESSAGE,
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MIN_QUOTA_PER_USER,
  STORAGE_OVERFLOW_ACTION,
  STORAGE_QUOTA,
  type TICategory,
  type TIChannel,
  type TIMessage,
  type TIRole,
  type TISettings,
  type TIUser
} from '@opencord/shared';
import { randomUUIDv7 } from 'bun';
import { logger } from '../logger';
import { db } from './index';
import {
  categories,
  channels,
  messages,
  rolePermissions,
  roles,
  settings,
  users
} from './schema';

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
    enableSearch: true
  };

  await db.insert(settings).values(initialSettings);

  const initialCategories: TICategory[] = [
    {
      name: 'Text Channels',
      position: 1,
      createdAt: firstStart
    },
    {
      name: 'Voice Channels',
      position: 2,
      createdAt: firstStart
    }
  ];

  const initialChannels: TIChannel[] = [
    {
      type: ChannelType.TEXT,
      name: 'OpenCord',
      position: 0,
      fileAccessToken: randomUUIDv7(),
      fileAccessTokenUpdatedAt: Date.now(),
      categoryId: 1,
      topic: 'Главный канал OpenCord',
      createdAt: firstStart
    },
    {
      type: ChannelType.TEXT,
      name: 'Главный',
      position: 1,
      fileAccessToken: randomUUIDv7(),
      fileAccessTokenUpdatedAt: Date.now(),
      categoryId: 1,
      topic: 'Основное общение сервера',
      createdAt: firstStart
    },
    {
      type: ChannelType.VOICE,
      name: 'OpenCord',
      position: 0,
      fileAccessToken: randomUUIDv7(),
      fileAccessTokenUpdatedAt: Date.now(),
      categoryId: 2,
      topic: 'Основной голосовой канал OpenCord',
      createdAt: firstStart
    },
    {
      type: ChannelType.VOICE,
      name: 'Общий',
      position: 1,
      fileAccessToken: randomUUIDv7(),
      fileAccessTokenUpdatedAt: Date.now(),
      categoryId: 2,
      topic: 'Общий голосовой канал сервера',
      createdAt: firstStart
    }
  ];

  const initialRoles: TIRole[] = [
    {
      name: 'Создатель',
      color: '#FFFFFF',
      isDefault: false,
      isPersistent: true,
      createdAt: firstStart
    },
    {
      name: 'Member',
      color: '#FFFFFF',
      isPersistent: true,
      isDefault: true,
      createdAt: firstStart
    }
  ];

  const systemUserPassword = await Bun.password.hash(randomUUIDv7());
  const initialUsers: TIUser[] = [
    {
      identity: `opencord-system-${randomUUIDv7()}`,
      name: 'OpenCord',
      avatarId: null,
      password: systemUserPassword,
      bannerId: null,
      bio: 'Системный пользователь OpenCord. Здесь публикуются стартовые сообщения сервера.',
      bannerColor:
        'linear-gradient(135deg, rgba(39,110,241,1) 0%, rgba(14,165,233,1) 100%)',
      createdAt: firstStart
    }
  ];

  const initialMessages: TIMessage[] = [
    {
      channelId: 1,
      content:
        '<p><strong>Добро пожаловать в OpenCord!</strong></p><p>Это основной канал сервера. Сюда можно отправлять сообщения, писать о найденных багах, делиться идеями по улучшению и сообщать обо всём, что поможет сделать OpenCord лучше.</p>',
      metadata: null,
      userId: 1,
      createdAt: firstStart
    }
  ];

  const initialRolePermissions: {
    [roleId: number]: Permission[];
  } = {
    1: Object.values(Permission), // Owner (all permissions)
    2: DEFAULT_ROLE_PERMISSIONS // Member (default permissions)
  };

  await db.insert(categories).values(initialCategories);
  await db.insert(channels).values(initialChannels);
  await db.insert(roles).values(initialRoles);
  await db.insert(users).values(initialUsers);
  await db.insert(messages).values(initialMessages);

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

