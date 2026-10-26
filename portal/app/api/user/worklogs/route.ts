import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { keepClaudeSection } from '@/lib/mcp/worklog';
import { db } from '@/lib/mongodb/db-client';
import { enforcePermission } from '@/lib/permissions/server';
import { worklogsForViewer } from '@/lib/worklogs/personal';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

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

  //let error_response: any;
  //console.log("fetching zeros on server", userId, config);
  try {
    const viewerUserId = await resolveViewerUserId();
    //console.log("fetching user on server", id, userType, role);
    const _workLogs = await db.workLogs.findMany({
      where: {
        ...(id && { id }),
        ...(userId && { userId }),
        ...(logType && { logType }),
        ...(date && { date }),
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    const sanitizedLogs = worklogsForViewer(_workLogs, viewerUserId);

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

export async function PUT(request: Request) {
  const denied = await enforcePermission('worklogs:edit');
  if (denied) return denied;

  try {
    // Links are kept up to date by /api/user/worklogs/links, never here, so an
    // autosave with an older copy cannot undo them.
    const { id, links: _links, ...rest } = await request.json();
    const { userId, logType, date } = rest ?? {};

    // People write their own worklogs only.
    const viewerUserId = await resolveViewerUserId();
    const existing =
      id && id.length > 2
        ? await db.workLogs.findFirst({ where: { id } })
        : null;
    const ownerId = existing?.userId ?? userId;
    if (!viewerUserId || (ownerId && ownerId !== viewerUserId)) {
      return NextResponse.json(
        { status: 'fail', error: 'You can only edit your own worklogs.' },
        { status: 403 },
      );
    }
    rest.userId = ownerId ?? viewerUserId;

    // Keep what the person's assistant logged since this copy was loaded.
    const stored =
      existing ??
      (logType && date
        ? await db.workLogs.findFirst({
            where: { userId: rest.userId, logType, date },
          })
        : null);
    if (stored && 'works' in rest)
      rest.works = keepClaudeSection(rest.works, stored.works);

    //console.log("updating worklogs on server", id, rest);
    let workLogs;
    if (logType === 'dayLog') {
      if (!userId || !date) {
        return new NextResponse(
          JSON.stringify({
            error: 'dayLog upsert requires userId and date',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      workLogs = await db.workLogs.upsert({
        where: {
          userId,
          logType,
          date,
        },
        create: { ...rest },
        update: { ...rest },
      });
    } else if (id && id.length > 2)
      workLogs = await db.workLogs.upsert({
        where: {
          id,
        },
        create: { ...rest },
        update: { ...rest },
      });
    else if (userId && logType && date)
      workLogs = await db.workLogs.upsert({
        where: {
          userId,
          logType,
          date,
        },
        create: { ...rest },
        update: { ...rest },
      });
    else
      workLogs = await db.workLogs.create({
        data: { ...rest },
      });

    const json_response = {
      status: 'success',
      data: {
        workLogs,
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
