import { getServerSession } from 'next-auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

function sanitizePrivateLines(content: string): string {
  const sanitized = content
    .split('\n')
    .filter((line) => !/^\s*(\*\s*)?p:/i.test(line))
    .join('\n')
    .trim();
  return sanitized.length > 0 ? sanitized : '*';
}

async function resolveViewerUserId(): Promise<string | null> {
  const session = (await getServerSession(authOptions as any)) as any;
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;
  if (!sessionUser) return null;
  if (sessionUser.id) {
    const byId = await db.user.findFirst({ where: { id: sessionUser.id } });
    if (byId?.id) return byId.id;
    const byUsername = await db.user.findFirst({
      where: { username: sessionUser.id },
    });
    if (byUsername?.id) return byUsername.id;
  }
  if (sessionUser.email) {
    const byEmail = await db.user.findFirst({ where: { email: sessionUser.email } });
    if (byEmail?.id) return byEmail.id;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') as string;
  const userId = request.nextUrl.searchParams.get('userId') as string;
  const logType = request.nextUrl.searchParams.get('logType') as string;
  const startDate = request.nextUrl.searchParams.get('startDate') as string;
  const endDate = request.nextUrl.searchParams.get('endDate') as string;
  const date = request.nextUrl.searchParams.get('date') as string;
  const engagementId = request.nextUrl.searchParams.get(
    'engagementId',
  ) as string;

  try {
    const viewerUserId = await resolveViewerUserId();
    const _workLogs = await db.workLogs.findMany({
      where: {
        ...(id && { id }),
        ...(userId && { userId }),
        ...(logType && { logType }),
        ...(date && { date }),
        ...(startDate && { date: { gte: startDate } }),
        ...(endDate && { date: { lte: endDate } }),
        ...(startDate && endDate
          ? { date: { gte: startDate, lte: endDate } }
          : {}),
      },
      orderBy: {
        date: 'desc',
      },
    });

    const filteredLogs = [];
    for (let i = 0; i < _workLogs.length; i++) {
      const worklog = _workLogs[i];
      const works = [];
      for (let j = 0; j < worklog.works.length; j++) {
        const work: any = worklog.works[j];
        if (
          work &&
          work?.link_type === 'engagement' &&
          work?.link_id === engagementId
        ) {
          works.push(work);
        }
      }
      if (works.length > 0) {
        const isOwner = viewerUserId && worklog.userId === viewerUserId;
        const sanitizedWorks = isOwner
          ? works
          : works.map((work: any) => ({
              ...work,
              content:
                typeof work?.content === 'string'
                  ? sanitizePrivateLines(work.content)
                  : work?.content,
            }));
        filteredLogs.push({
          ...worklog,
          works: sanitizedWorks,
        });
      }
    }

    const json_response = {
      status: 'success',
      data: {
        workLogs: filteredLogs,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
