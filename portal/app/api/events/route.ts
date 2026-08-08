import { startOfToday } from 'date-fns';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission } from '@/lib/permissions/server';

const formatDate = (date: any) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

export async function POST(req: NextRequest) {
  const denied = await enforcePermission('events:create');
  if (denied) return denied;

  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: 'Body not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { title, subTitle, link, date, month, year, time } = body;

    if (!title || !subTitle || !link || !date || !month || !year || !time) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const newEvent = await db.event.create({
      data: {
        name: title,
        subTitle,
        link,
        date,
        time,
        month,
        year,
      },
    });

    return new NextResponse(JSON.stringify(newEvent), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating badge details:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(req: NextRequest) {
  const denied = await enforcePermission('events:read');
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const limit = searchParams.get('limit');

    const todayFormatted = formatDate(startOfToday());

    const events = await db.event.findMany({
      where: {
        month: month ? parseInt(month) : undefined,
        year: year ? parseInt(year) : undefined,
        date: {
          gte: todayFormatted,
        },
      },
      orderBy: {
        date: 'asc',
      },
      ...(limit && { take: Number(limit) }),
    });

    return new NextResponse(
      JSON.stringify({
        status: 'success',
        data: events,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error fetching badges:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await enforcePermission('events:edit');
  if (denied) return denied;

  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: 'Body not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { id, title, subTitle, link, date, month, year, time } = body;

    if (
      !id ||
      !title ||
      !subTitle ||
      !link ||
      !date ||
      !month ||
      !year ||
      !time
    ) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const updatedEvent = await db.event.update({
      where: { id },
      data: {
        name: title,
        subTitle,
        link,
        date,
        time,
        month,
        year,
      },
    });

    return new NextResponse(JSON.stringify(updatedEvent), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error updating event details:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request: Request) {
  const denied = await enforcePermission('events:delete');
  if (denied) return denied;

  try {
    const { id, ...rest } = await request.json();

    const deletedEvent = await db.event.delete({
      where: { id },
    });

    const json_response = {
      status: 'success',
      data: {
        deletedEvent,
      },
    };

    return NextResponse.json(json_response);
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
