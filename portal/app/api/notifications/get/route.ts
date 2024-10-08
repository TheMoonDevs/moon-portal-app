import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") as string;
  const ifModifiedSince = request.headers.get("If-Modified-Since");

  try {
    const lastModifiedDate = ifModifiedSince ? new Date(ifModifiedSince) : null;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(lastModifiedDate && { updatedAt: { gt: lastModifiedDate } }),
      },
      orderBy: [
        { isRead: 'asc' },
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    if (notifications.length === 0) {
      // If there are no new or updated notifications, return 304 Not Modified
      return new NextResponse(null, {
        status: 304,
      });
    }

    const json_response = {
      status: "success",
      data: {
        notifications,
      },
    };

    return NextResponse.json(json_response, {
      headers: {
        "Last-Modified": new Date().toUTCString(),
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return new NextResponse(JSON.stringify(error), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
