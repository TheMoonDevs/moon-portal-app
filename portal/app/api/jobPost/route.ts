import { prisma } from "@/prisma/prisma";
import { JOBPOST } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  id: string;
  jobpost: JOBPOST;
};

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") as string;
  const jobpost = request.nextUrl.searchParams.get("userType") as JOBPOST;

  let error_response: any;

  try {
    const jobPost = await prisma.jobPost.findMany({
      where: {
        ...(id && { id }),
        ...(jobpost && { jobpost }),
      },
    });

    if (error_response) {
      return new NextResponse(JSON.stringify(error_response), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    let json_response = {
      status: "success",
      data: {
        jobPost,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: Request) {
  //console.log(request.body);
  try {
    const { id, ...json } = await request.json();
    // console.log(json);

    const jobPost = await prisma.jobPost.create({
      data: {
        ...json,
      },
    });

    let json_response = {
      status: "success",
      data: {
        jobPost,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...rest } = await request.json();
    console.log(rest);

    const jobPost = await prisma.jobPost.upsert({
      where: {
        id,
      },
      create: { ...rest },
      update: { ...rest },
    });
    console.log(jobPost);

    let json_response = {
      status: "success",
      data: {
        jobPost,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") as string;

  let error_response: any;

  if (!id) {
    error_response = {
      status: "fail",
      message: "Job Post ID is required",
    };
  }

  try {
    const jobPost = await prisma.jobPost.delete({
      where: {
        id,
      },
    });

    if (error_response) {
      return new NextResponse(JSON.stringify(error_response), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    let json_response = {
      status: "success",
      data: {
        jobPost,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 501,
      headers: { "Content-Type": "application/json" },
    });
  }
}
