import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { parseCreateInput, parseUpdateInput } from '@/lib/mongodb/validation';

export async function GET(request: NextRequest) {
  const missionId = request.nextUrl.searchParams.get('missionId') as string;

  try {
    const tasks = await db.missionTask.findMany({
      where: {
        ...(missionId && { missionId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      status: 'success',
      data: { tasks },
    });
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const createData = parseCreateInput('missionTask', data);

    const task = await db.missionTask.create({
      data: createData,
    });

    return NextResponse.json({
      status: 'success',
      data: { task },
    });
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...rest } = await request.json();
    const parsedCreate = parseCreateInput('missionTask', { ...rest, id });
    const parsedUpdate = parseUpdateInput('missionTask', rest);

    const task = await db.missionTask.upsert({
      where: {
        id,
      },
      create: parsedCreate,
      update: parsedUpdate,
    });

    const json_response = {
      status: 'success',
      data: {
        task,
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
  try {
    const id = request.nextUrl.searchParams.get('id') as string;
    if (!id) {
      return new NextResponse(JSON.stringify({ error: 'Missing id' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const task = await db.missionTask.delete({
      where: { id },
    });

    return NextResponse.json({
      status: 'success',
      data: { task },
    });
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
