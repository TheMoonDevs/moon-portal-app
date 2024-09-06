import { prisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const badge = await prisma.badgeTemplate.findUnique({
      where: { id },
    });

    if (!badge) {
      return new NextResponse(JSON.stringify({ error: 'Badge not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new NextResponse(
      JSON.stringify({ status: 'success', data: badge }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching badge details:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: 'Body not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { badgeName, badgeDescription, imageurl, criteria } = body;

    if (!badgeName || !badgeDescription || !criteria) {
      return new NextResponse(
        JSON.stringify({ error: 'Required fields are missing' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updatedBadge = await prisma.badgeTemplate.update({
      where: { id },
      data: {
        name: badgeName,
        description: badgeDescription,
        imageurl,
        criteria,
      },
    });

    return new NextResponse(
      JSON.stringify({ status: 'success', data: updatedBadge }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error updating badge details:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    await prisma.badgeTemplate.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting badge:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
