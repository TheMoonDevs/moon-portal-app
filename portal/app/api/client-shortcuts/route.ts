import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "Body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = await req.json();
    const newShortcut = await prisma.clientUtilityLink.create({
      data: {
        title: body.title,
        url: body.link,
        clientId: body.clientId,
      },
    });

    return new NextResponse(
      JSON.stringify({
        status: "success",
        data: newShortcut,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Error Posting Client Shortcuts" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {

    const clients = await prisma.user.findMany({
      where: { userType: "CLIENT" },
    });

    const shortcuts = await prisma.clientUtilityLink.findMany();

    const groupedData = clients.map((client) => {
      const clientShortcuts = shortcuts.filter(
        (shortcut) => shortcut.clientId === client.id
      );
      return {
        clientName: client.name,
        shortcuts: clientShortcuts,
        avatar: client.avatar,
      };
    });

    return NextResponse.json({
      status: "success",
      data: groupedData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error Getting Client Shortcuts" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updatedShortcut = await prisma.clientUtilityLink.update({
      where: {
        id: body.id,
      },
      data: {
        title: body.title,
        url: body.link,
        clientId: body.clientId,
      }
    });
    return NextResponse.json({
      status: "success",
      data: updatedShortcut
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error Updating Client Shortcuts" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const deletedShortcut = await prisma.clientUtilityLink.delete({
      where: {
        id: body.id,
      },
    });
    return NextResponse.json({
      status: "success",
      data: deletedShortcut,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error Deleting Client Shortcuts" },
      { status: 500 }
    );
  }
}