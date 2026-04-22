export enum LocalStorageKey {
  IDENTITY = 'opencord-identity',
  REMEMBER_CREDENTIALS = 'opencord-remember-identity',
  USER_PASSWORD = 'opencord-user-password',
  SERVER_PASSWORD = 'opencord-server-password',
  VITE_UI_THEME = 'vite-ui-theme',
  DEVICES_SETTINGS = 'opencord-devices-settings',
  FLOATING_CARD_POSITION = 'opencord-floating-card-position',
  VOICE_CHAT_SIDEBAR_STATE = 'opencord-voice-chat-sidebar-state',
  VOICE_CHAT_SIDEBAR_CHANNEL_ID = 'opencord-voice-chat-sidebar-channel-id',
  VOICE_CHAT_SIDEBAR_WIDTH = 'opencord-voice-chat-sidebar-width',
  VOICE_CHAT_SHOW_USER_BANNERS = 'opencord-voice-chat-show-user-banners',
  VOLUME_SETTINGS = 'opencord-volume-settings',
  RECENT_EMOJIS = 'opencord-recent-emojis',
  DEBUG = 'opencord-debug',
  DRAFT_MESSAGES = 'opencord-draft-messages',
  HIDE_NON_VIDEO_PARTICIPANTS = 'opencord-hide-non-video-participants',
  THREAD_SIDEBAR_WIDTH = 'opencord-thread-sidebar-width',
  LEFT_SIDEBAR_WIDTH = 'opencord-left-sidebar-width',
  CATEGORIES_EXPANDED = 'opencord-categories-expanded',
  AUTO_LOGIN = 'opencord-auto-login',
  AUTO_LOGIN_TOKEN = 'opencord-auto-login-token',
  LAST_SELECTED_CHANNEL = 'opencord-last-selected-channel',
  AUTO_JOIN_LAST_CHANNEL = 'opencord-auto-join-last-channel',
  BROWSER_NOTIFICATIONS = 'opencord-browser-notifications',
  BROWSER_NOTIFICATIONS_FOR_MENTIONS = 'opencord-browser-notifications-for-mentions',
  BROWSER_NOTIFICATIONS_FOR_DMS = 'opencord-browser-notifications-for-dms',
  LANGUAGE = 'opencord-language'
}

export enum SessionStorageKey {
  TOKEN = 'opencord-token'
}

const getLocalStorageItem = (key: LocalStorageKey): string | null => {
  return localStorage.getItem(key);
};

const getLocalStorageItemBool = (
  key: LocalStorageKey,
  defaultValue: boolean = false
): boolean => {
  const item = localStorage.getItem(key);

  if (item === null) {
    return defaultValue ?? false;
  }

  return item === 'true';
};

const setLocalStorageItemBool = (
  key: LocalStorageKey,
  value: boolean
): void => {
  localStorage.setItem(key, value.toString());
};

const getLocalStorageItemAsNumber = (
  key: LocalStorageKey,
  defaultValue?: number
): number | undefined => {
  const item = localStorage.getItem(key);

  if (item === null) {
    return defaultValue;
  }

  const parsed = parseInt(item, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const getLocalStorageItemAsJSON = <T>(
  key: LocalStorageKey,
  defaultValue: T | undefined = undefined
): T | undefined => {
  const item = localStorage.getItem(key);

  if (item) {
    return JSON.parse(item) as T;
  }

  return defaultValue;
};

const setLocalStorageItemAsJSON = <T>(key: LocalStorageKey, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const setLocalStorageItem = (key: LocalStorageKey, value: string): void => {
  localStorage.setItem(key, value);
};

const removeLocalStorageItem = (key: LocalStorageKey): void => {
  localStorage.removeItem(key);
};

const getSessionStorageItem = (key: SessionStorageKey): string | null => {
  return sessionStorage.getItem(key);
};

const setSessionStorageItem = (key: SessionStorageKey, value: string): void => {
  sessionStorage.setItem(key, value);
};

const removeSessionStorageItem = (key: SessionStorageKey): void => {
  sessionStorage.removeItem(key);
};

export {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  getLocalStorageItemAsNumber,
  getLocalStorageItemBool,
  getSessionStorageItem,
  removeLocalStorageItem,
  removeSessionStorageItem,
  setLocalStorageItem,
  setLocalStorageItemAsJSON,
  setLocalStorageItemBool,
  setSessionStorageItem
};

