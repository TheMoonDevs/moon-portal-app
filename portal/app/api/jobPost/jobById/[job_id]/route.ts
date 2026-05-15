import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET(
  request: Request,
  { params }: { params: { job_id: string } },
) {
  {
    const { job_id } = params;

    try {
      const jobPost = await db.jobPost.findUnique({
        where: {
          id: job_id,
        },
        select: {
          title: true,
          description: true,
          status: true,
          jobpost: true,
        },
      });
      if (!jobPost) {
        return NextResponse.json(
          { message: 'Job post not found' },
          { status: 404 },
        );
      }
      return NextResponse.json(jobPost, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { message: 'Something went wrong' },
        { status: 500 },
      );
    }
  }
}
