import { prisma } from "@/prisma/prisma";
import { USERDIRECTORYTYPE } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") as string;
  const directoryType = request.nextUrl.searchParams.get(
    "directoryType"
  ) as USERDIRECTORYTYPE;

  try {
    const favoriteDirectories = await prisma.userDirectory.findMany({
      where: {
        directoryType: directoryType,
        userId,
      },
      include: {
        directoryData: true,
      },
    });
    console.log(favoriteDirectories);
    return NextResponse.json(favoriteDirectories);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: NextRequest) {
  const { userId, directoryId, directoryType } = await request.json();

  if (!userId || !directoryId || !directoryType) {
    return new NextResponse(
      JSON.stringify({
        error: "Missing userId or directoryId or directoryType",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const directoryExist = await prisma.userDirectory.findFirst({
      where: {
        userId,
        directoryId,
        directoryType,
      },
    });
    if (directoryExist && directoryType === USERDIRECTORYTYPE.FAVORITED) {
      const deletedUserDirectory = await prisma.userDirectory.delete({
        where: {
          id: directoryExist.id,
          directoryType: USERDIRECTORYTYPE.FAVORITED,
        },
      });
      return NextResponse.json(deletedUserDirectory, {
        status: 200,
        statusText: "Unfavorited!",
      });
    }

    if (directoryExist && directoryType === USERDIRECTORYTYPE.OTHER) {
      //   try {
      //     const updatedTopUsedCounterInLink = await prisma.userDirectory.update({
      //       where: {
      //         id: directoryExist.directoryId,
      //       },
      //       data: {
      //         clickCount: {
      //           increment: 1,
      //         },
      //       },
      //     });
      //   } catch (e) {
      //     console.log(e);
      //   }
      // console.log(updatedTopUsedCounterInLink);
      const updatedUserDirectory = await prisma.userDirectory.update({
        where: {
          id: directoryExist.id,
        },
        data: {
          timestamp: new Date(),
          clickCount: {
            increment: 1,
          },
        },
      });

      return NextResponse.json(updatedUserDirectory);
    }

    const userDirectory = await prisma.userDirectory.create({
      data: {
        userId,
        directoryId,
        directoryType,
        clickCount: 0,
      },
    });
    let statusText = "Favorited";
    if (directoryType === USERDIRECTORYTYPE.OTHER) {
      statusText = "Added to other";
    }

    return NextResponse.json(userDirectory, {
      status: 200,
      statusText: statusText,
    });
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
