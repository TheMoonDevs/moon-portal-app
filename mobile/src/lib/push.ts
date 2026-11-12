import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

/*
 * Push notifications: the portal sends to the phone's Expo push token (see
 * portal/lib/push/expo.ts) with `data.url`, the website page it is about;
 * tapping one opens that screen in the app (lib/links.ts).
 */

/** The chat open on screen; its messages don't need a banner. */
let openChatId: string | null = null;
export const setOpenChat = (id: string | null) => {
  openChatId = id;
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const chat = (notification.request.content.data as { chat?: { conversationId?: string } })
      ?.chat;
    const quiet = !!chat?.conversationId && chat.conversationId === openChatId;
    return {
      shouldShowBanner: !quiet,
      shouldShowList: !quiet,
      shouldPlaySound: !quiet,
      shouldSetBadge: true,
    };
  },
});

let prepared = false;

/** Android channels and the "Mark as read" button; once per launch. */
async function prepare() {
  if (prepared) return;
  prepared = true;
  if (Platform.OS === 'android') {
    // eslint-plugin-import can't read this enum from the package's build.
    /* eslint-disable import/namespace */
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders and updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
    });
    /* eslint-enable import/namespace */
  }
  await Notifications.setNotificationCategoryAsync('chat', [
    {
      identifier: 'chat-read',
      buttonTitle: 'Mark as read',
      options: { opensAppToForeground: false },
    },
  ]).catch(() => null);
}

const projectId = () =>
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
  Constants.easConfig?.projectId;

export type PushResult = 'on' | 'denied' | 'unavailable';

/**
 * Asks for permission (once), gets this phone's push token and gives it to
 * the portal. Simulators and builds without push set up answer unavailable.
 */
export async function registerForPush(ask = true): Promise<PushResult> {
  if (!Device.isDevice) return 'unavailable';
  await prepare();
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && ask) ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return 'denied';
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await api('/api/mobile/push', { method: 'POST', body: { expoPushToken: data } });
    return 'on';
  } catch {
    // Android without google-services.json, or no network: try next launch.
    return 'unavailable';
  }
}

/** Stops the portal sending to this phone. */
export async function unregisterPush() {
  await api('/api/mobile/push', { method: 'DELETE' }).catch(() => null);
}

/** The number on the app icon. */
export function setBadge(count: number) {
  void Notifications.setBadgeCountAsync(Math.max(0, count)).catch(() => null);
}

export type PushData = {
  url?: string | null;
  chat?: { conversationId?: string; messageId?: string } | null;
};
