import type { TJoinedSettings, TPublicServerSettings } from '@opencord/shared';
import { eq } from 'drizzle-orm';
import { db } from '..';
import { config } from '../../config';
import { files, settings } from '../schema';

// since this is static, we can keep it in memory to avoid querying the DB every time
let token: string;
const LEGACY_GARBLED_SERVER_DESCRIPTION = '��������� ������ OpenCord';
const DEFAULT_SERVER_DESCRIPTION = 'Приватный сервер OpenCord';

const normalizeServerDescription = (description: string | null) => {
  if (description === LEGACY_GARBLED_SERVER_DESCRIPTION) {
    return DEFAULT_SERVER_DESCRIPTION;
  }

  return description;
};

const getSettings = async (): Promise<TJoinedSettings> => {
  const serverSettings = await db.select().from(settings).get()!;
  const normalizedDescription = normalizeServerDescription(
    serverSettings.description
  );

  if (normalizedDescription !== serverSettings.description) {
    await db
      .update(settings)
      .set({ description: normalizedDescription })
      .where(eq(settings.serverId, serverSettings.serverId))
      .execute();
  }

  const logo = serverSettings.logoId
    ? await db
        .select()
        .from(files)
        .where(eq(files.id, serverSettings.logoId))
        .get()
    : undefined;

  return {
    ...serverSettings,
    description: normalizedDescription,
    logo: logo ?? null
  };
};

const getPublicSettings: () => Promise<TPublicServerSettings> = async () => {
  const settings = await getSettings();

  const publicSettings: TPublicServerSettings = {
    description: settings.description ?? '',
    name: settings.name,
    serverId: settings.serverId,
    storageUploadEnabled: settings.storageUploadEnabled,
    directMessagesEnabled: settings.directMessagesEnabled,
    storageQuota: settings.storageQuota,
    storageUploadMaxFileSize: settings.storageUploadMaxFileSize,
    storageFileSharingInDirectMessages:
      settings.storageFileSharingInDirectMessages,
    storageMaxAvatarSize: settings.storageMaxAvatarSize,
    storageMaxBannerSize: settings.storageMaxBannerSize,
    storageMaxFilesPerMessage: settings.storageMaxFilesPerMessage,
    storageSpaceQuotaByUser: settings.storageSpaceQuotaByUser,
    storageOverflowAction: settings.storageOverflowAction,
    enablePlugins: settings.enablePlugins,
    webRtcMaxBitrate: config.webRtc.maxBitrate,
    enableSearch: settings.enableSearch
  };

  return publicSettings;
};

const getServerTokenSync = (): string => {
  if (!token) {
    throw new Error('Server token has not been initialized yet');
  }

  return token;
};

const getServerToken = async (): Promise<string> => {
  if (token) return token;

  const { secretToken } = await getSettings();

  if (!secretToken) {
    throw new Error('Secret token not found in database settings');
  }

  token = secretToken;

  return token;
};

export { getPublicSettings, getServerToken, getServerTokenSync, getSettings };

