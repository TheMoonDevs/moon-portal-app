import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const notificationId = data.id;

    const updatedNotification = await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data,
    });

    const json_response = {
      status: "success",
      data: {
        notification: updatedNotification,
      },
    };

    return NextResponse.json(json_response, { status: 200 });
  } catch (error: any) {
    console.error("Error updating notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
