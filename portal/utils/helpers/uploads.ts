import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

/** Uploads a profile photo for `userId` and returns its URL. Throws a readable message. */
export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ avatar: string; updatedAt?: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image.');
  if (file.size > 4 * 1024 * 1024)
    throw new Error('Images must be under 4 MB.');
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

/** Uploads any image and returns its public URL. Throws a readable message. */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image.');
  if (file.size > 4 * 1024 * 1024) {
    throw new Error('Images must be under 4 MB.');
  }
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/upload/image', {
    method: 'POST',
    headers: { tmd_portal_api_key: TMD_PORTAL_API_KEY },
    body,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.url) {
    throw new Error(json?.error || 'Upload failed. Please try again.');
  }
  return json.data.url;
}

const DIRECT_MAX = 4 * 1024 * 1024;

/**
 * Uploads a brand file (image, font, video, audio, guide…) and returns its
 * public URL. Small files go through the portal; big ones straight to
 * storage. Throws a readable message.
 */
export async function uploadBrandFile(file: File): Promise<string> {
  const headers = { tmd_portal_api_key: TMD_PORTAL_API_KEY };
  if (file.size <= DIRECT_MAX) {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/upload/asset', {
      method: 'POST',
      headers,
      body,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.data?.url) {
      throw new Error(json?.error || `Could not upload ${file.name}.`);
    }
    return json.data.url;
  }

  const res = await fetch('/api/upload/asset', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      size: file.size,
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.uploadUrl) {
    throw new Error(json?.error || `Could not upload ${file.name}.`);
  }
  const put = await fetch(json.data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': json.data.contentType },
    body: file,
  }).catch(() => null);
  if (!put?.ok) {
    throw new Error(
      `${file.name} is too big to upload right now. Files over 4 MB need storage CORS to allow uploads from the portal.`,
    );
  }
  return json.data.url;
}
