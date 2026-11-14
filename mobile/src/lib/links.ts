import type { Href } from 'expo-router';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { portalUrl } from './api';
import { PORTAL_URL } from './config';
import { todayKey } from './dates';

/*
 * Notifications and pushes link to website pages (`/messages/<id>`,
 * `/meet?booking=…`). These are the app's screens for them; anything else
 * opens the website in an in-app browser.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The app screen for a website link, or null when the app has none. */
export function screenFor(link: string | null | undefined): Href | null {
  if (!link) return null;
  let url: URL;
  try {
    url = new URL(link, PORTAL_URL);
  } catch {
    return null;
  }
  // Another site: never an app screen.
  if (url.host !== new URL(PORTAL_URL).host) return null;
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  const q = url.searchParams;

  if (parts[0] === 'messages')
    return parts[1] ? { pathname: '/chat/[id]', params: { id: parts[1] } } : '/messages';
  if (parts[0] === 'user' && parts[1] === 'worklogs') {
    const date = q.get('date');
    if (date && DAY.test(date) && date !== todayKey()) return { pathname: '/work', params: { date } };
    return '/work';
  }
  if (parts[0] === 'user') return { pathname: '/person/[id]', params: { id: parts[1] ?? 'me' } };
  if (parts[0] === 'rest-day') return '/work';
  if (parts[0] === 'meet' && !parts[1]) return '/meetings';
  if (parts[0] === 'projects' && parts[1])
    return { pathname: '/project/[id]', params: { id: parts[1] } };
  if (parts[0] === 'projects') return '/projects';
  if (parts[0] === 'goals') return '/goals';
  if (parts[0] === 'plans') {
    const plan = q.get('plan_id') ?? q.get('plan') ?? parts[1];
    return plan ? { pathname: '/plan/[id]', params: { id: plan } } : '/plans';
  }
  if (parts[0] === 'notifications') return '/notifications';
  if (parts[0] === 'task' && parts[1]) return { pathname: '/task/[id]', params: { id: parts[1] } };
  if (path === '/' || parts[0] === 'home') return '/';
  return null;
}

/**
 * A portal page for the in-app browser. `inApp=1` tells the website it's
 * already inside the app, so it skips its "Get the app" splash.
 */
const inAppUrl = (link: string) => {
  const url = portalUrl(link);
  if (!url.startsWith(PORTAL_URL)) return url;
  const [base, hash] = url.split('#');
  const tagged = `${base}${base.includes('?') ? '&' : '?'}inApp=1`;
  return hash === undefined ? tagged : `${tagged}#${hash}`;
};

/** Opens a portal link: its app screen, or the website in the app. */
export async function openLink(link: string | null | undefined) {
  if (!link) return;
  const screen = screenFor(link);
  if (screen) {
    router.push(screen);
    return;
  }
  await WebBrowser.openBrowserAsync(inAppUrl(link)).catch(() => null);
}

/** Opens a website page in the in-app browser. */
export function openWebsite(path = '/') {
  return WebBrowser.openBrowserAsync(inAppUrl(path)).catch(() => null);
}
