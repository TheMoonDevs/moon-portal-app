import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET(request: Request) {} // DO NOT REMOVE THIS LINE
export async function POST(request: Request) {
  try {
    const json = await request.json();

    const clientSurvey = await db.clientLeadForm.create({
      data: {
        ...json,
      },
    });

    const json_response = {
      status: 'success',
      data: {
        clientSurvey,
      },
    };

    return NextResponse.json(json_response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
