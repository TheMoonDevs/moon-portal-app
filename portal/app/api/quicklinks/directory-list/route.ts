import type { ROOTTYPE } from '@db/client';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { parseCreateInput, parseUpdateInput } from '@/lib/mongodb/validation';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const slug = request.nextUrl.searchParams.get('slug');
  const tabType = request.nextUrl.searchParams.get('tabType') as ROOTTYPE;
  const userId = request.nextUrl.searchParams.get('userId') as string;
  let directoryList = [];
  try {
    if (!userId) {
      directoryList = await db.directoryList.findMany({
        where: {
          ...(id && { id: id }),
          ...(slug && { slug: slug }),
          ...(tabType && { tabType: tabType }),
        },
      });
    } else {
      directoryList = await db.directoryList.findMany({
        where: {
          ...(id && { id: id }),
          ...(slug && { slug: slug }),
        },

        include: {
          userDirectory: {
            where: {
              userId: userId,
              directoryType: 'FAVORITED',
            },
            select: {
              directoryId: true,
            },
          },
        },
      });
    }
    const json_response = {
      status: 'success',
      data: {
        directoryList,
      },
    };
    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: Request) {
  const newDirectory = await request.json();

  try {
    const lastDirectory = await db.directoryList.findFirst({
      where: { parentDirId: newDirectory.parentDirId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const newPosition = lastDirectory ? lastDirectory.position + 10 : 10;
    const createData = parseCreateInput('directoryList', {
      ...newDirectory,
      position: newPosition,
    });
    const directory = await db.directoryList.create({
      data: createData,
    });
    const json_response = {
      status: 'success',
      data: { directory },
    };
    return NextResponse.json(json_response);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return new NextResponse(JSON.stringify({ error: 'Missing id' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const directory = await db.directoryList.delete({
      where: {
        id: id,
      },
    });
    const json_response = {
      status: 'success',
      data: {
        directory,
      },
    };
    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(request: NextRequest) {
  const { id, ...rest } = await request.json();
  if (!id) {
    return new NextResponse(JSON.stringify({ error: 'Missing id' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const updateData = parseUpdateInput('directoryList', rest);
    const directory = await db.directoryList.update({
      where: {
        id: id,
      },
      data: updateData,
    });
    const json_response = {
      status: 'success',
      data: {
        directory,
      },
    };
    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
