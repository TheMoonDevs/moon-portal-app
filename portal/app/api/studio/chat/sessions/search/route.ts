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

export async function GET(req: NextRequest) {
  const denied = await enforcePermission('studio:read');
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  if (StudioConfig.studioSettings.database.type === 'upstash-redis') {
    const sessions = await sessionStore.list();
    const filteredSessions = sessions.filter((session) =>
      session.title.toLowerCase().includes(query?.toLowerCase() ?? ''),
    );
    return NextResponse.json(filteredSessions, { status: 200 });
  } else {
    const sessionIds = await sessionLocalListOut();
    const sessions = (
      await Promise.all(
        sessionIds.map(async (sessionId: string) => {
          const store = await sesionLocalStore(sessionId);
          const session = await store?.get<ChatSessionData>('sessionData');
          return session?.session;
        }),
      )
    ).filter((session) => session !== null);
    return NextResponse.json(sessions, { status: 200 });
  }
}
