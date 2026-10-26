import type { MeetBooking, MeetProfile } from '@/models/meet';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

/** A booking as the host's list shows it. */
export type HostBooking = Omit<MeetBooking, 'token'> & { role: string | null };

export type MeetAction = 'approve' | 'propose' | 'decline' | 'cancel';

/** Calls a Meet endpoint and returns `data`, or throws with the server's message. */
export async function meetApi<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: 'no-store',
    headers:
      method === 'GET'
        ? undefined
        : {
            'Content-Type': 'application/json',
            tmd_portal_api_key: TMD_PORTAL_API_KEY,
          },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Something went wrong.');
  return json.data as T;
}

export const answerBooking = (
  bookingId: string,
  action: MeetAction,
  extra: { start?: string; reason?: string } = {},
) =>
  meetApi<{ booking: HostBooking }>(`/api/meet/bookings/${bookingId}`, 'POST', {
    action,
    ...extra,
  });

export type ProfileResponse = { profile: MeetProfile; link: string };
