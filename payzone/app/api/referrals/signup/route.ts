import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, name, avatar } = body;
  // console.log(body);
  try {
    let user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      if (user.name === null || user.avatar === null) {
        user = await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            ...(user.name === null && { name }),
            ...(user.avatar === null && { avatar }),
          },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          ...body,
          username:
            name.slice(0, 3).toUpperCase() || email.slice(0, 3).toUpperCase(),
          password: (Math.floor(Math.random() * 900) + 100).toString(),
        },
      });
    }

    const jsonResponse = {
      status: "success",
      data: {
        user,
      },
    };

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
