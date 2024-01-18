import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";

type Params = {
  id: string;
};

export async function GET(request: Request, { params }: { params: Params }) {
  const id = params.id;

  let error_response: any;

  if (!id) {
    error_response = {
      status: "fail",
      message: "User ID is required",
    };
  }

  try {
    const survey = await prisma.survey.findUnique({
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
        survey,
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
  try {
    const json = await request.json();

    const survey = await prisma.survey.create({
      data: {
        ...json,
      },
    });

    let json_response = {
      status: "success",
      data: {
        survey,
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

export async function PUT(request: Request) {
  try {
    const { id, ...rest } = await request.json();

    const survey = await prisma.survey.upsert({
      where: {
        id,
      },
      create: { ...rest },
      update: { ...rest },
    });

    let json_response = {
      status: "success",
      data: {
        survey,
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

export async function DELETE(request: Request, { params }: { params: Params }) {
  const id = params.id;

  let error_response: any;

  if (!id) {
    error_response = {
      status: "fail",
      message: "User ID is required",
    };
  }

  try {
    const survey = await prisma.survey.delete({
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
        survey,
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
