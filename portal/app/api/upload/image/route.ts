import { NextResponse } from 'next/server';

import { requireAuthedPermission } from '@/lib/permissions/server';
import { s3FileUploadSdk } from '@/utils/services/s3FileUploadSdk';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

/**
 * Upload an image (multipart `file`) and get back its public URL. It saves
 * nothing else: the form that asked for it stores the URL through its own
 * endpoint, which checks whether you may change that record.
 */
export async function POST(request: Request) {
  const { response, user } = await requireAuthedPermission('files:create');
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return fail(400, 'Choose an image.');
  const ext = TYPES[file.type];
  if (!ext) return fail(400, 'Use a PNG, JPG, WebP, GIF or SVG image.');
  if (file.size > MAX_BYTES) return fail(400, 'Images must be under 4 MB.');

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const folder = 'images';
  const res = await s3FileUploadSdk.uploadFile({
    userId: user.id,
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

  const url = s3FileUploadSdk
    .getPublicFileUrl({ userId: user.id, folder, file: { fileName } })
    .trim();
  return NextResponse.json({ status: 'success', data: { url } });
}
