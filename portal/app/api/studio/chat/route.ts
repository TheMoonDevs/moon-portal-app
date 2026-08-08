import type { UIMessage } from 'ai';
import type { NextRequest } from 'next/server';

import { aiMainRouter } from '@/app/ai';
import { chatRestoreLocal } from '@/app/api/studio/chat/sessions/chatSessionLocal';
import { chatRestoreUpstash } from '@/app/api/studio/chat/sessions/chatSessionUpstash';
import { enforcePermission } from '@/lib/permissions/server';
import { StudioConfig } from '@/microfox.config';

// export const maxDuration = 300_1000;

export async function POST(req: NextRequest) {
  const denied = await enforcePermission('studio:edit');
  if (denied) return denied;

  const body = await req.json();
  const { messages, ...restOfBody } = body;
  const lastMessage = body.messages?.[body.messages.length - 1] as UIMessage<{
    revalidatePath?: string;
  }>;
  const revalidatePath = lastMessage?.metadata?.revalidatePath;

  return aiMainRouter
    .before(
      '/',
      StudioConfig.studioSettings.database.type === 'upstash-redis'
        ? chatRestoreUpstash
        : chatRestoreLocal,
    )
    .handle(revalidatePath ? revalidatePath : '/', {
      request: {
        ...body,
        messages: messages,
        loadedRevalidatePath: revalidatePath,
      },
    });
}
