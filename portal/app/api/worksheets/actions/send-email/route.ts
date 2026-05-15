import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

async function sendEmailAction(row: Record<string, any>) {
  console.log(`Sending email to ${row.email} for row ${row.id}...`);
  // Simulate email sending
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(`Email sent successfully to ${row.email}!`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const row = body?.row;
    if (!row || typeof row !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid row in request body' },
        { status: 400 },
      );
    }

    await sendEmailAction(row as Record<string, unknown>);
    const now = new Date().toISOString();
    return NextResponse.json({
      status: 'success',
      patch: {
        last_email_sent_at: now,
      },
    });
  } catch (e) {
    console.error('Send email action error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Action failed' },
      { status: 500 },
    );
  }
}
