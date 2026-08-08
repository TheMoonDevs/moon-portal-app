import { generateId } from 'ai';
import dayjs from 'dayjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { ChatSessionData } from '@/app/api/studio/chat/sessions/chatSessionLocal';
import {
  sesionLocalStore,
  sessionLocalListOut,
} from '@/app/api/studio/chat/sessions/chatSessionLocal';
import { sessionStore } from '@/app/api/studio/chat/sessions/chatSessionUpstash';
import { enforcePermission } from '@/lib/permissions/server';
import { StudioConfig } from '@/microfox.config';

export async function POST(req: NextRequest) {
  const denied = await enforcePermission('studio:edit');
  if (denied) return denied;

  const body = await req.json();
  const sessionId = generateId();
  const date = dayjs().format('DD-MM-YYYY');
  if (StudioConfig.studioSettings.database.type === 'upstash-redis') {
    const session = await sessionStore.set(sessionId, {
      id: sessionId,
      title: 'New Chat - ' + date,
      createdAt: new Date().toISOString(),
      ...body,
    });
    return NextResponse.json(session, { status: 201 });
  } else {
    const store = await sesionLocalStore(sessionId);
    const session = {
      id: sessionId,
      title: 'New Chat - ' + date,
      createdAt: new Date().toISOString(),
      ...body,
    };
    await store?.set('sessionData', {
      session: session,
      messages: [],
    });
    return NextResponse.json(session, { status: 201 });
  }
}

export async function GET(req: NextRequest) {
  const denied = await enforcePermission('studio:read');
  if (denied) return denied;

  if (StudioConfig.studioSettings.database.type === 'upstash-redis') {
    const sessions = await sessionStore.list();
    return NextResponse.json(sessions, { status: 200 });
  } else {
    const sessionIds = await sessionLocalListOut();
    if (!sessionIds) {
      return NextResponse.json([], { status: 200 });
    }
    const sessions = (
      await Promise.all(
        sessionIds.map(async (sessionId: string) => {
          const store = await sesionLocalStore(sessionId);
          const session = await store?.get<ChatSessionData>('sessionData');
          return session?.session;
        }),
      )
    ).filter((session) => session !== null && session !== undefined);
    return NextResponse.json(sessions, { status: 200 });
  }
}
