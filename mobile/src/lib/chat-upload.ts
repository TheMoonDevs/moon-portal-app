import { File } from 'expo-file-system';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';

import { api } from './api';
import { newClientId } from './chat';
import type { ChatMessage } from './types';

/*
 * Sending a photo or file from the phone into a chat, as the website does:
 * the portal signs an upload link (portal/lib/chat/storage.ts), the file goes
 * straight to storage, then the message points at it.
 */

export type LocalFile = {
  uri: string;
  name: string;
  mime: string;
  width?: number | null;
  height?: number | null;
};

type Upload = { key: string; url: string; headers: Record<string, string> };

export async function sendFileToChat(conversationId: string, file: LocalFile, text = '') {
  const size = new File(file.uri).size;
  if (!size) throw new Error('The file is empty.');
  const { uploads } = await api<{ uploads: Upload[] }>('/api/chat/uploads', {
    method: 'POST',
    body: { conversationId, files: [{ name: file.name, mime: file.mime, size, role: 'main' }] },
  });
  const upload = uploads[0];
  if (!upload) throw new Error('The upload could not start.');
  const put = await uploadAsync(upload.url, file.uri, {
    httpMethod: 'PUT',
    headers: upload.headers,
    uploadType: FileSystemUploadType.BINARY_CONTENT,
  });
  if (put.status < 200 || put.status >= 300)
    throw new Error(`The upload didn’t go through (${put.status}).`);
  const { message } = await api<{ message: ChatMessage }>(
    `/api/chat/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: {
        clientId: newClientId(),
        text,
        attachment: {
          key: upload.key,
          name: file.name,
          mime: file.mime,
          width: file.width ?? null,
          height: file.height ?? null,
        },
      },
    },
  );
  return message;
}
