import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

/** Uploads a profile photo for `userId` and returns its URL. Throws a readable message. */
export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ avatar: string; updatedAt?: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image.');
  if (file.size > 5 * 1024 * 1024)
    throw new Error('Images must be under 5 MB.');
  const body = new FormData();
  body.append('file', file);
  body.append('userId', userId);
  const res = await fetch('/api/user/avatar', {
    method: 'POST',
    headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY },
    body,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.avatar) {
    throw new Error(json?.error || 'Upload failed. Please try again.');
  }
  return json.data;
}
