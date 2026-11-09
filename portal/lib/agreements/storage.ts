import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/*
 * Imported documents (PDFs signed outside the Portal) live privately in
 * DigitalOcean Spaces under `agreements/<companyId>/`. Browsers upload
 * straight to Spaces with a signed link, as chat files do (Vercel refuses
 * request bodies over ~4.5 MB); the Portal reads them back after an access
 * check. The bucket's CORS rule for chat uploads covers these too.
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
  folder: 'agreements',
};

export const importPrefix = (companyId: string) =>
  `${storage.folder}/${companyId}/imports/`;

/** A signed link the browser can PUT one PDF to, valid for 30 minutes. */
export async function presignPdfUpload(key: string, size: number) {
  const url = await getSignedUrl(
    storage.client,
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      ACL: 'private',
      ContentType: 'application/pdf',
      ContentLength: size,
    }),
    {
      expiresIn: 30 * 60,
      signableHeaders: new Set(['content-type', 'content-length']),
    },
  );
  return { url, headers: { 'Content-Type': 'application/pdf' } };
}

/** The stored file's bytes, or null when there is none. */
export async function readStored(key: string): Promise<Uint8Array | null> {
  try {
    const res = await storage.client.send(
      new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
    return res.Body ? await res.Body.transformToByteArray() : null;
  } catch {
    return null;
  }
}

/** A link to read a stored file for ten minutes. */
export function signedReadUrl(key: string, fileName: string, inline: boolean) {
  const safe = fileName.replace(/[^\w\s.-]+/g, '').trim() || 'document.pdf';
  return getSignedUrl(
    storage.client,
    new GetObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: `${inline ? 'inline' : 'attachment'}; filename="${safe}"`,
    }),
    { expiresIn: 10 * 60 },
  );
}

export async function deleteStored(key: string) {
  await storage.client
    .send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }))
    .catch((e) => console.error('[agreements] delete file', e));
}
