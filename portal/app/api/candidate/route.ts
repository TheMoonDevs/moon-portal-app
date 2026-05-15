import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

type Params = {
  id: string;
  name: string;
};

export async function GET(request: Request, { params }: { params: Params }) {
  const id = params.id;
  const name = params.name;

  let error_response: any;

  if (!id) {
    error_response = {
      status: 'fail',
      message: 'User ID is required',
    };
  }

  try {
    const candidate = await db.candidate.findUnique({
      where: {
        id,
        ...(name && { name }),
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
        candidate,
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

    // check if phone number already exists

    const existedMobileNumber = await db.candidate.count({
      where: {
        mobileNumber: json.mobileNumber,
      },
    });

    if (existedMobileNumber > 0) {
      return new NextResponse(
        JSON.stringify({ message: 'Mobile number already exists' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const candidate = await db.candidate.create({
      data: {
        ...json,
      },
    });

    const json_response = {
      status: 'success',
      data: {
        candidate,
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

    const candidate = await db.candidate.upsert({
      where: {
        id,
      },
      create: { ...rest },
      update: { ...rest },
    });

    const json_response = {
      status: 'success',
      data: {
        candidate,
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
    const candidate = await db.candidate.delete({
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
        candidate,
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
