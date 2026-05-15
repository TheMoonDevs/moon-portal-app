import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function POST(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: 'Body not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const body = await req.json();
    const newShortcut = await db.clientUtilityLink.create({
      data: {
        title: body.title,
        url: body.link,
        clientId: body.clientId,
        icon: body.icon,
      },
    });

    return new NextResponse(
      JSON.stringify({
        status: 'success',
        data: newShortcut,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error Posting Client Shortcuts' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const clients = await db.user.findMany({
      where: { userType: 'CLIENT' },
    });

    const shortcuts = await db.clientUtilityLink.findMany();

    const groupedData = clients.map((client: any) => {
      const clientShortcuts = shortcuts.filter(
        (shortcut: any) => shortcut.clientId === client.id,
      );
      return {
        clientName: client.name,
        shortcuts: clientShortcuts,
        avatar: client.avatar,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: groupedData,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Error Getting Client Shortcuts' },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updatedShortcut = await db.clientUtilityLink.update({
      where: {
        id: body.id,
      },
      data: {
        title: body.title,
        url: body.link,
        clientId: body.clientId,
        icon: body.icon,
      },
    });
    return NextResponse.json({
      status: 'success',
      data: updatedShortcut,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error Updating Client Shortcuts' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const deletedShortcut = await db.clientUtilityLink.delete({
      where: {
        id: body.id,
      },
    });
    return NextResponse.json({
      status: 'success',
      data: deletedShortcut,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error Deleting Client Shortcuts' },
      { status: 500 },
    );
  }
}
