import type { ChatConversation, ChatMessage, ChatPerson } from '@/models/chat';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';

export type { ChatConversation, ChatMessage, ChatPerson };

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Calls a chat endpoint and returns `data`, or throws with the server's message. */
export async function chatApi<T>(
  url: string,
  method: Method = 'GET',
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: 'no-store',
    headers:
      method === 'GET'
        ? undefined
        : {
            'Content-Type': 'application/json',
            tmd_portal_api_key: TMD_PORTAL_API_KEY,
          },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json?.error || 'Something went wrong.');
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  return json.data as T;
}

export const mediaUrl = (
  messageId: string,
  { thumb, download }: { thumb?: boolean; download?: boolean } = {},
) => {
  const params = new URLSearchParams();
  if (thumb) params.set('v', 'thumb');
  if (download) params.set('download', '1');
  const query = params.toString();
  return `/api/chat/media/${messageId}${query ? `?${query}` : ''}`;
};

type Upload = { key: string; url: string; headers: Record<string, string> };

/** PUTs a file to a signed Spaces link, reporting progress (0 to 1). */
export function putFile(
  upload: Upload,
  file: Blob,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', upload.url);
    for (const [k, v] of Object.entries(upload.headers))
      xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error('The upload failed. Try again.'));
    xhr.onerror = () =>
      reject(new Error('The upload failed. Check your connection.'));
    xhr.onabort = () => reject(new DOMException('Cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
}

/** Asks for signed links for a file and its preview. */
export const requestUploads = (
  conversationId: string,
  files: { name: string; mime: string; size: number; role: 'main' | 'thumb' }[],
) =>
  chatApi<{ uploads: Upload[] }>('/api/chat/uploads', 'POST', {
    conversationId,
    files,
  });
