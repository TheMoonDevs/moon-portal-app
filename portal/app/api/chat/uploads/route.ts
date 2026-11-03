import { chatRoute, readJson } from '@/lib/chat/api';
import { ChatError, requireConversation } from '@/lib/chat/server';
import {
  checkUpload,
  presignUpload,
  type UploadRequest,
} from '@/lib/chat/storage';

export const dynamic = 'force-dynamic';

/**
 * Signed links to upload a file (and its preview) straight to Spaces, for a
 * chat the user is in. Body: { conversationId, files: [{ name, mime, size,
 * role }] }.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  return chatRoute(async (user) => {
    const conversationId = String(body.conversationId ?? '');
    await requireConversation(user.id, conversationId);
    const files = (
      Array.isArray(body.files) ? body.files : []
    ) as UploadRequest[];
    if (!files.length || files.length > 2)
      throw new ChatError(400, 'Send one file at a time.');
    for (const file of files) {
      const problem = checkUpload(file);
      if (problem) throw new ChatError(400, problem);
    }
    return {
      uploads: await Promise.all(
        files.map((f) => presignUpload(conversationId, f)),
      ),
    };
  });
}
