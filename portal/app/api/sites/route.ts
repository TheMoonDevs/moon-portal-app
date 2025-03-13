// portal/app/api/sites/create.ts
import { prisma } from '@/prisma/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const sites = await prisma.site.findMany({
      where: {
        ...(id && { id }),
      },
    });
    return NextResponse.json(sites);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get sites' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const site = await prisma.site.create({ data });
    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create site' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.site.delete({ where: { id } });
    return NextResponse.json({ message: 'Site deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to delete site' },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    const updatedSite = await prisma.site.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json(updatedSite);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update site' },
      { status: 500 },
    );
  }
}
