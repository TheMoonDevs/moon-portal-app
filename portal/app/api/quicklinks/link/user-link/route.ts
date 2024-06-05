import { prisma } from "@/prisma/prisma";
import { USERLINKTYPE } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") as string;
  const linkType = request.nextUrl.searchParams.get("linkType") as USERLINKTYPE;

  try {
    const favoriteLinks = await prisma.userLink.findMany({
      where: {
        linkType: linkType,
        userId,
      },
      select: {
        linkType: true,
        linkData: {
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
        },
        // topUsed: linkType === USERLINKTYPE.TOPUSED,
      },
      orderBy: {
        topUsed: "desc",
      },
    });

    return NextResponse.json(favoriteLinks);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: NextRequest) {
  const { userId, linkId, linkType } = await request.json();

  if (!userId || !linkId || !linkType) {
    return new NextResponse(
      JSON.stringify({ error: "Missing userId or linkId or linkType" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const linkExist = await prisma.userLink.findFirst({
      where: {
        userId,
        linkId,
        linkType,
      },
    });
    if (linkExist && linkType === USERLINKTYPE.FAVORITED) {
      const deletedLink = await prisma.userLink.delete({
        where: {
          id: linkExist.id,
          linkType: USERLINKTYPE.FAVORITED,
        },
      });
      return NextResponse.json(deletedLink, {
        status: 200,
        statusText: "Unfavorited!",
      });
    }

    if (linkExist && linkType === USERLINKTYPE.TOPUSED) {
      try {
        const updatedTopUsedCounterInLink = await prisma.link.update({
          where: {
            id: linkExist.linkId,
          },
          data: {
            clickCount: {
              increment: 1,
            },
          },
        });
      } catch (e) {
        console.log(e);
      }
      // console.log(updatedTopUsedCounterInLink);
      const updatedTopUsedCounterInUserLink = await prisma.userLink.update({
        where: {
          id: linkExist.id,
        },
        data: {
          topUsed: {
            increment: 1,
          },
        },
      });

      return NextResponse.json(updatedTopUsedCounterInUserLink);
    }

    const link = await prisma.userLink.create({
      data: {
        userId,
        linkId,
        linkType,
        topUsed: 0,
      },
    });
    let statusText = "Favorited";
    if (linkType === USERLINKTYPE.TOPUSED) {
      statusText = "Added to top used";
    }

    return NextResponse.json(link, {
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
