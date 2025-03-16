import { prisma } from '@/prisma/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get('variantId');
    const postId = searchParams.get('postId');
    const siteId = searchParams.get('siteId');

    const variants = await prisma.postVariant.findMany({
      where: {
        ...(variantId && { variantId }),
        ...(postId && { postId }),
        ...(siteId && { siteId }),
      },
      include: {
        originPost: true,
      },
    });
    return NextResponse.json(variants);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to get variants' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const variant = await prisma.postVariant.create({ data });
    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create variant' },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { id, variantId, postId, ...updates } = await req.json();
    const updatedVariant = await prisma.postVariant.update({
      where: { variantId },
      data: updates,
    });
    return NextResponse.json(updatedVariant);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update variant' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { variantId } = await req.json();
    await prisma.postVariant.delete({ where: { variantId } });
    return NextResponse.json({ message: 'Variant deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to delete variant' },
      { status: 500 },
    );
  }
}
