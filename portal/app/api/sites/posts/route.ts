import { prisma } from '@/prisma/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const siteId = searchParams.get('siteId');
    console.log(siteId, id, req.url);
    const post = await prisma.post.findMany({
      where: {
        ...(id && { id }),
        ...(siteId && { siteId }),
      },
    });
    return NextResponse.json(post);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get post' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const post = await prisma.post.create({ data });
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    const updatedPost = await prisma.post.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ message: 'Post deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 },
    );
  }
}
