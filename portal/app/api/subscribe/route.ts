import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const subscriber = await db.emailSubscriber.create({ data });
    return NextResponse.json(subscriber, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create subscriber' },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (email) {
      const subscriber = await db.emailSubscriber.findUnique({
        where: { email },
      });
      if (!subscriber) {
        return NextResponse.json(
          { error: 'Subscriber not found' },
          { status: 404 },
        );
      }
      return NextResponse.json(subscriber);
    }

    if (id) {
      const subscriber = await db.emailSubscriber.findUnique({
        where: { id },
      });
      if (!subscriber) {
        return NextResponse.json(
          { error: 'Subscriber not found' },
          { status: 404 },
        );
      }
      return NextResponse.json(subscriber);
    }

    const subscribers = await db.emailSubscriber.findMany();
    return NextResponse.json(subscribers);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    const updatedSubscriber = await db.emailSubscriber.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json(updatedSubscriber);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update subscriber' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await db.emailSubscriber.delete({ where: { id } });
    return NextResponse.json({ message: 'Subscriber deleted' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete subscriber' },
      { status: 500 },
    );
  }
}
