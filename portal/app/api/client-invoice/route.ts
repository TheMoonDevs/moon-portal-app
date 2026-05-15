import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function POST(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: 'Body not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    if (body.isInvoicePaid) {
      body.paidDate = new Date();
    } else {
      body.paidDate = null;
    }
    const newInvoice = await db.invoice.create({
      data: {
        ...body,
      },
    });
    return NextResponse.json(
      {
        status: 'success',
        data: newInvoice,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating invoice' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId') as string;
  try {
    const invoices = await db.invoice.findMany({
      where: {
        clientId: clientId,
      },
    });
    return NextResponse.json({
      status: 'success',
      data: invoices,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error retrieving invoices' },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const isInvoicePaid = body.formData.isInvoicePaid;
    const currentInvoice = await db.invoice.findUnique({
      where: {
        id: body.id,
      },
    });
    const updatedInvoice = await db.invoice.update({
      where: {
        id: body.id,
      },
      data: {
        ...body.formData,
        paidDate:
          !currentInvoice?.paidDate &&
          isInvoicePaid &&
          isInvoicePaid !== currentInvoice?.isInvoicePaid
            ? new Date()
            : null,
      },
    });
    return NextResponse.json({
      status: 'success',
      data: updatedInvoice,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Error updating invoice' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const deletedInvoice = await db.invoice.delete({
      where: {
        id: body.id,
      },
    });
    return NextResponse.json({
      status: 'success',
      data: deletedInvoice,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error deleting invoice' },
      { status: 500 },
    );
  }
}
