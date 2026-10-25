import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { isAllowed } from '@/lib/permissions/defaults';
import { getSessionUser } from '@/lib/permissions/server';
import { s3FileUploadSdk } from '@/utils/services/s3FileUploadSdk';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

/**
 * Upload a profile photo (multipart: `file`, `userId`). Anyone can change
 * their own; changing someone else's needs `users:edit`. Saves it on the user
 * straight away and returns the new URL.
 */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const userId = String(form?.get('userId') || actor.id);
  if (!file || typeof file === 'string') return fail(400, 'Choose an image.');

  if (userId !== actor.id && !isAllowed(actor, 'users:edit')) {
    return fail(403, "You cannot change someone else's photo.");
  }
  const ext = TYPES[file.type];
  if (!ext) return fail(400, 'Use a PNG, JPG, WebP or GIF image.');
  if (file.size > MAX_BYTES) return fail(400, 'Images must be under 5 MB.');

  const user = await db.user.findFirst({ where: { id: userId } });
  if (!user) return fail(404, 'User not found.');

  // A new name each time so the CDN never serves the old photo.
  const fileName = `${Date.now()}.${ext}`;
  const folder = 'avatars';
  const res = await s3FileUploadSdk.uploadFile({
    userId,
    folder,
    fileInfoWithFileBuffer: {
      fileName,
      fileType: file.type,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
    },
  });
  if (!res || res.$metadata.httpStatusCode !== 200) {
    return fail(502, 'Upload failed. Please try again.');
  }

  const avatar = s3FileUploadSdk
    .getPublicFileUrl({ userId, folder, file: { fileName } })
    .trim();
  const updated = await db.user.update({
    where: { id: userId },
    data: { avatar, updatedAt: new Date() },
  });
  return NextResponse.json({
    status: 'success',
    data: { avatar, updatedAt: updated.updatedAt },
  });
}
