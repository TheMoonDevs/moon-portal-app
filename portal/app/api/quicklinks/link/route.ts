import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET(request: NextRequest) {
  const directoryId = request.nextUrl.searchParams.get('directoryId');
  const linkId = request.nextUrl.searchParams.get('linkId');
  const rootParentDirId = request.nextUrl.searchParams.get('rootParentDirId');
  const searchQuery = request.nextUrl.searchParams.get('searchQuery');
  const offset = request.nextUrl.searchParams.get('offset');
  const limit = request.nextUrl.searchParams.get('limit');

  try {
    const links = await db.link.findMany({
      where: {
        ...(searchQuery && {
          title: { contains: searchQuery, mode: 'insensitive' },
        }),
        ...(directoryId && { directoryId: directoryId }),
        ...(linkId && { id: linkId }),
        ...(rootParentDirId && { rootParentDirId: rootParentDirId }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            vertical: true,
            role: true,
            userType: true,
          },
        },
      },
      skip: offset ? Number(offset) : 0,
      ...(limit && { take: Number(limit) }),
    });
    const json_response = {
      status: 'success',
      data: {
        links,
      },
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
export async function POST(request: Request) {
  const newLink = await request.json();

  try {
    const link = await db.link.create({
      data: newLink,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            vertical: true,
            role: true,
            userType: true,
          },
        },
      },
    });
    const json_response = {
      status: 'success',
      data: {
        link,
      },
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

export async function PUT(request: Request) {
  const { linkId, updateQuery } = await request.json();
  try {
    const link = await db.link.update({
      where: {
        id: linkId,
      },
      data: updateQuery,
    });
    const json_response = {
      status: 'success',
      data: {
        link,
      },
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
  const linkId = request.nextUrl.searchParams.get('linkId') as string;
  try {
    const link = await db.link.delete({
      where: {
        id: linkId,
      },
    });
    const json_response = {
      status: 'success',
      data: {
        link,
      },
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
