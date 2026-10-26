import { NextResponse } from 'next/server';

import { requireAuthedPermission } from '@/lib/permissions/server';
import { s3FileUploadSdk } from '@/utils/services/s3FileUploadSdk';

export const dynamic = 'force-dynamic';

/** Files above this go straight from the browser to storage. */
const DIRECT_MAX = 4 * 1024 * 1024;
const MAX_BYTES = 500 * 1024 * 1024;
const FOLDER = 'brand';

const EXT = /^[a-z0-9]{1,8}$/;
const ALLOWED = [
  /^image\//,
  /^video\//,
  /^audio\//,
  /^font\//,
  /^application\/(pdf|json|font-.+|x-font-.+|vnd\.ms-fontobject)$/,
  /^text\/(markdown|plain|css|x-markdown)$/,
];

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

const fileNameFor = (name: string) => {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const base = name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return `${stamp}-${base || 'file'}${EXT.test(ext) ? `.${ext}` : ''}`;
};

/** Browsers leave the type blank for fonts and some text files. */
const typeFor = (type: string, name: string) => {
  if (type) return type;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return (
    {
      ttf: 'font/ttf',
      otf: 'font/otf',
      woff: 'font/woff',
      woff2: 'font/woff2',
      md: 'text/markdown',
      txt: 'text/plain',
    }[ext] ?? ''
  );
};

/**
 * Upload a brand file (logo, font, video, guide…) and get its public URL.
 *
 * - multipart `file` (up to 4 MB): uploaded here.
 * - JSON `{ fileName, fileType, size }`: returns `{ uploadUrl, url }`; the
 *   browser PUTs the file to `uploadUrl` with the same Content-Type.
 *
 * Nothing else is saved; the form stores the URL through its own endpoint.
 */
export async function POST(request: Request) {
  const { response, user } = await requireAuthedPermission('files:create');
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const isJson = request.headers
    .get('content-type')
    ?.includes('application/json');

  if (isJson) {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.fileName === 'string' ? body.fileName : '';
    const type = typeFor(
      typeof body.fileType === 'string' ? body.fileType : '',
      name,
    );
    const size = Number(body.size) || 0;
    if (!name) return fail(400, 'fileName is required.');
    if (!ALLOWED.some((re) => re.test(type)))
      return fail(400, `${name}: this kind of file is not supported.`);
    if (size > MAX_BYTES) return fail(400, `${name} is over 500 MB.`);

    const fileName = fileNameFor(name);
    const uploadUrl = await s3FileUploadSdk.getUploadUrl({
      userId: user.id,
      folder: FOLDER,
      fileName,
      fileType: type,
    });
    if (!uploadUrl) return fail(502, 'Could not start the upload.');
    const url = s3FileUploadSdk
      .getPublicFileUrl({ userId: user.id, folder: FOLDER, file: { fileName } })
      .trim();
    return NextResponse.json({
      status: 'success',
      data: { uploadUrl, url, contentType: type },
    });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return fail(400, 'Choose a file.');
  const type = typeFor(file.type, file.name);
  if (!ALLOWED.some((re) => re.test(type)))
    return fail(400, `${file.name}: this kind of file is not supported.`);
  if (file.size > DIRECT_MAX)
    return fail(413, 'Large files are uploaded directly; request a link.');

  const fileName = fileNameFor(file.name);
  const res = await s3FileUploadSdk.uploadFile({
    userId: user.id,
    folder: FOLDER,
    fileInfoWithFileBuffer: {
      fileName,
      fileType: type,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
    },
  });
  if (!res || res.$metadata.httpStatusCode !== 200) {
    return fail(502, 'Upload failed. Please try again.');
  }
  const url = s3FileUploadSdk
    .getPublicFileUrl({ userId: user.id, folder: FOLDER, file: { fileName } })
    .trim();
  return NextResponse.json({ status: 'success', data: { url } });
}
