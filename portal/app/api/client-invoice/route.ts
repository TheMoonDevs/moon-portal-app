import { prisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: 'Body not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const newInvoice = await prisma.invoice.create({
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
    const invoices = await prisma.invoice.findMany({
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
    const updatedInvoice = await prisma.invoice.update({
      where: {
        id: body.id,
      },
      data: {
        ...body,
      },
    });
    return NextResponse.json({
      status: 'success',
      data: updatedInvoice,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error updating invoice' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const deletedInvoice = await prisma.invoice.delete({
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
