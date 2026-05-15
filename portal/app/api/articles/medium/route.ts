import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET() {
  try {
    const blogs = await db.article.findMany({
      where: { articleType: 'medium' },
    });
    console.log(blogs);
    return NextResponse.json({ blogs });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching blogs' },
      { status: 500 },
    );
  }
}
