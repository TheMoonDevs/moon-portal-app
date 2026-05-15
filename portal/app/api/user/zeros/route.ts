import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId') as string;
  const config = request.nextUrl.searchParams.get('config') as string;
  const year = request.nextUrl.searchParams.get('year') as string;

  //let error_response: any;
  //console.log("fetching zeros on server", userId, config);
  try {
    //console.log("fetching user on server", id, userType, role);
    const _zeroRecords = await db.zeroRecords.findMany({
      where: {
        ...(userId && { userId }),
        ...(config && { config }),
        ...(year && { year }),
      },
    });

    const json_response = {
      status: 'success',
      data: {
        zeroRecords: _zeroRecords,
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
  try {
    const { id, ...rest } = await request.json();

    console.log('updating zeros on server', id, rest);
    let zeroRecords;
    if (id)
      zeroRecords = await db.zeroRecords.upsert({
        where: {
          id,
        },
        create: { ...rest },
        update: { ...rest },
      });
    else
      zeroRecords = await db.zeroRecords.create({
        data: { ...rest },
      });

    const json_response = {
      status: 'success',
      data: {
        zeroRecords,
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
