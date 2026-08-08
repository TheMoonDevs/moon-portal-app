import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission } from '@/lib/permissions/server';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

function sanitizePrivateLines(content: string): string {
  const sanitized = content
    .split('\n')
    .filter((line) => !/^\s*(\*\s*)?p:/i.test(line))
    .join('\n')
    .trim();
  return sanitized.length > 0 ? sanitized : '*';
}

function sanitizeWorklogsForViewer(
  workLogs: Array<Record<string, any>>,
  viewerUserId: string | null,
): Array<Record<string, any>> {
  return workLogs.map((worklog) => {
    const isOwner = viewerUserId && worklog.userId === viewerUserId;
    if (isOwner) return worklog;
    const works = Array.isArray(worklog.works)
      ? worklog.works.map((work: Record<string, any>) => {
          if (!work || typeof work.content !== 'string') return work;
          return { ...work, content: sanitizePrivateLines(work.content) };
        })
      : worklog.works;
    return { ...worklog, works };
  });
}

async function resolveViewerUserId(): Promise<string | null> {
  const session = (await getServerSession(authOptions as any)) as any;
  const sessionUser = session?.user as
    | { id?: string; email?: string }
    | undefined;
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
    const byEmail = await db.user.findFirst({
      where: { email: sessionUser.email },
    });
    if (byEmail?.id) return byEmail.id;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = await enforcePermission('worklogs:read');
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id') as string;
  const userId = request.nextUrl.searchParams.get('userId') as string;
  const logType = request.nextUrl.searchParams.get('logType') as string;
  const date = request.nextUrl.searchParams.get('date') as string;
  const month = request.nextUrl.searchParams.get('month') as string;
  const year = request.nextUrl.searchParams.get('year') as string;
  // console.log(userId);
  // console.log(id);
  //let error_response: any;
  //console.log("fetching zeros on server", userId, config);
  try {
    const viewerUserId = await resolveViewerUserId();
    let dateFilter: any = {};
    if (year && month && year !== 'null' && month !== 'null') {
      dateFilter = {
        startsWith: `${year}-${month}`,
      };
    } else if (year && year !== 'null') {
      dateFilter = {
        startsWith: `${year}-`,
      };
    } else if (month && month !== 'null') {
      dateFilter = {
        contains: `-${month}-`,
      };
    }

    // console.log(dateFilter);
    //console.log("fetching user on server", id, userType, role);
    const _workLogs = await db.workLogs.findMany({
      where: {
        ...(id && { id }),
        ...(userId && { userId }),
        ...(logType && { logType }),
        date: dateFilter,
      },

      orderBy: {
        date: 'asc',
      },
    });
    const sanitizedLogs = sanitizeWorklogsForViewer(_workLogs, viewerUserId);

    // console.log(_workLogs);

    const json_response = {
      status: 'success',
      data: {
        workLogs: sanitizedLogs,
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
