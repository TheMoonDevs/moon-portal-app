import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';

import { CHAT_LIMITS, type ChatKind } from '@/models/chat';

/*
 * Photos, videos and files sent in chats live privately in DigitalOcean
 * Spaces under `chat/<chatId>/`. Browsers upload straight to Spaces with a
 * signed link (Vercel refuses request bodies over ~4.5 MB), and files are
 * only shown through short-lived signed links after a membership check.
 * The bucket needs a CORS rule allowing PUT from the portal's origin; see
 * scripts/chat-spaces-cors.mjs.
 */

const storage = {
  client: new S3({
    forcePathStyle: false,
    endpoint: process.env.SPACES_ENDPOINT,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.SPACES_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.SPACES_SECRET_KEY || '',
    },
  }),
  bucket: process.env.SPACES_NAME || '',
  folder: 'chat',
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/** What kind of message a file makes, from its type. */
export const kindOfMime = (mime: string): ChatKind => {
  if (IMAGE_TYPES.includes(mime)) return 'image';
  if (VIDEO_TYPES.includes(mime)) return 'video';
  return 'file';
};

export const chatPrefix = (conversationId: string) =>
  `${storage.folder}/${conversationId}/`;

export interface UploadRequest {
  name: string;
  mime: string;
  size: number;
  /** `thumb` is the small preview made in the browser. */
  role?: 'main' | 'thumb';
}

/** Why a file can't be sent, or null when it can. */
export function checkUpload(file: UploadRequest): string | null {
  if (!file || typeof file.name !== 'string' || typeof file.mime !== 'string')
    return 'Missing file details.';
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) return 'The file is empty.';
  const kind = kindOfMime(file.mime);
  if (file.role === 'thumb') {
    if (kind !== 'image') return 'Previews must be images.';
    if (size > 2 * 1024 * 1024) return 'The preview is too large.';
    return null;
  }
  const limit =
    kind === 'image' ? CHAT_LIMITS.maxImageBytes : CHAT_LIMITS.maxFileBytes;
  if (size > limit)
    return `${file.name} is over ${Math.round(limit / 1024 / 1024)} MB.`;
  return null;
}

const safeName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80) || 'file';

/** A signed link the browser can PUT one file to, valid for 30 minutes. */
export async function presignUpload(
  conversationId: string,
  file: UploadRequest,
) {
  const name = safeName(file.name);
  const key = `${chatPrefix(conversationId)}${randomBytes(12).toString('hex')}${
    file.role === 'thumb' ? '-thumb' : ''
  }-${name}`;
  const url = await getSignedUrl(
    storage.client,
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      ACL: 'private',
      ContentType: file.mime,
      ContentLength: Number(file.size),
    }),
    {
      expiresIn: 30 * 60,
      signableHeaders: new Set(['content-type', 'content-length']),
    },
  );
  return {
    key,
    url,
    headers: { 'Content-Type': file.mime },
  };
}

/** The stored size of a file, or null when it was never uploaded. */
export async function storedSize(key: string): Promise<number | null> {
  try {
    const head = await storage.client.send(
      new HeadObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
    return head.ContentLength ?? null;
  } catch {
    return null;
  }
}

/** A link to a chat file that works for an hour. */
export function signedMediaUrl(
  key: string,
  { download, name }: { download?: boolean; name?: string } = {},
) {
  return getSignedUrl(
    storage.client,
    new GetObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      ...(download && {
        ResponseContentDisposition: `attachment; filename="${safeName(
          name || 'file',
        )}"`,
      }),
    }),
    { expiresIn: 60 * 60 },
  );
}

/** Remove files from Spaces, up to 1,000 per call. */
export async function deleteMedia(keys: string[]) {
  const unique = Array.from(new Set(keys.filter(Boolean)));
  for (let i = 0; i < unique.length; i += 1000) {
    await storage.client.send(
      new DeleteObjectsCommand({
        Bucket: storage.bucket,
        Delete: {
          Objects: unique.slice(i, i + 1000).map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
}
