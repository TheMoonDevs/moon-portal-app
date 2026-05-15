import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

type Params = {
  id: string;
};

export async function GET(request: Request, { params }: { params: Params }) {
  const id = params.id;

  let error_response: any;

  if (!id) {
    error_response = {
      status: 'fail',
      message: 'User ID is required',
    };
  }

  try {
    const survey = await db.survey.findUnique({
      where: {
        id,
      },
    });

    if (error_response) {
      return new NextResponse(JSON.stringify(error_response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const json_response = {
      status: 'success',
      data: {
        survey,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const survey = await db.survey.create({
      data: {
        ...json,
      },
    });

    const json_response = {
      status: 'success',
      data: {
        survey,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...rest } = await request.json();

    const survey = await db.survey.upsert({
      where: {
        id,
      },
      create: { ...rest },
      update: { ...rest },
    });

    const json_response = {
      status: 'success',
      data: {
        survey,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const id = params.id;

  let error_response: any;

  if (!id) {
    error_response = {
      status: 'fail',
      message: 'User ID is required',
    };
  }

  try {
    const survey = await db.survey.delete({
      where: {
        id,
      },
    });

    if (error_response) {
      return new NextResponse(JSON.stringify(error_response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const json_response = {
      status: 'success',
      data: {
        survey,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
