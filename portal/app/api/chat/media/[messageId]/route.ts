import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ChatError, messageForMedia } from '@/lib/chat/server';
import { signedMediaUrl } from '@/lib/chat/storage';
import { fail, requireUser } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * Opens a chat file: checks the user may see the message, then redirects to
 * a signed Spaces link. `?v=thumb` for the preview, `?download=1` to save it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } },
) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  try {
    const doc = await messageForMedia(user.id, params.messageId);
    const attachment = doc.attachment;
    if (!attachment) return fail(404, 'This message has no file.');
    if (attachment.expiredAt)
      return fail(410, 'This file was removed after 90 days.');
    const search = request.nextUrl.searchParams;
    const key =
      search.get('v') === 'thumb' && attachment.thumbKey
        ? attachment.thumbKey
        : attachment.key;
    const url = await signedMediaUrl(key, {
      download: search.get('download') === '1',
      name: attachment.name,
    });
    return NextResponse.redirect(url, {
      status: 302,
      // The signed link lasts an hour; let the browser reuse it for most of it.
      headers: { 'Cache-Control': 'private, max-age=3000' },
    });
  } catch (error) {
    if (error instanceof ChatError) return fail(error.status, error.message);
    console.error('[chat] media', error);
    return fail(500, 'Something went wrong.');
  }
}
