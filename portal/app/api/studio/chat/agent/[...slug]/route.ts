import type { UIMessage } from 'ai';
import type { NextRequest } from 'next/server';

import { aiMainRouter } from '@/app/ai';
import { enforcePermission } from '@/lib/permissions/server';

//get example: http://localhost:3000/api/studio/chat/agent/thinker/questions?userIntent=

export async function GET(req: NextRequest) {
  const denied = await enforcePermission('studio:read');
  if (denied) return denied;

  const agentFullPath = req.nextUrl.href.split('/api/studio/chat/agent')[1];
  const agentPath = agentFullPath.includes('?')
    ? agentFullPath.split('?')[0]
    : agentFullPath;

  const searchParams = req.nextUrl.searchParams;
  const params: any = {};
  searchParams.entries().forEach(([key, value]) => {
    params[key] = value;
  });
  const response = await aiMainRouter.toAwaitResponse(agentPath, {
    request: {
      messages: [],
      params,
    },
  });

  return response;
}

//post example:
// curl -X POST http://localhost:3000/api/studio/chat/agent/thinker/questions
//      -H "Content-Type: application/json"
//      -d '{"messages": [{"role": "user", "content": "What is the capital of France?"}]}'

export async function POST(req: NextRequest) {
  const denied = await enforcePermission('studio:edit');
  if (denied) return denied;

  const body = await req.json();

  const agentFullPath = req.nextUrl.href.split('/api/studio/chat/agent')[1];
  const agentPath = agentFullPath.includes('?')
    ? agentFullPath.split('?')[0]
    : agentFullPath;

  const searchParams = req.nextUrl.searchParams;
  const paramsFromQuery: any = {};
  searchParams.entries().forEach(([key, value]) => {
    paramsFromQuery[key] = value;
  });
  // Use body.params when provided (e.g. orchestration sends { input, params }); otherwise query only.
  const params =
    typeof body?.params === 'object' && body.params !== null
      ? { ...body.params, ...paramsFromQuery }
      : paramsFromQuery;

  const lastMessage = body.messages?.[body.messages.length - 1] as UIMessage<{
    revalidatePath?: string;
  }>;

  return await aiMainRouter.toAwaitResponse(agentPath, {
    request: {
      ...body,
      params,
    },
  });
}
