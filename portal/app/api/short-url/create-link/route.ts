import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission } from '@/lib/permissions/server';

export async function POST(req: NextRequest) {
  const denied = await enforcePermission('shortlinks:create');
  if (denied) return denied;

  // Check if the slug already exists
  const { url, slug, params } = await req.json();

  if (!slug.match('^[-a-zA-Z0-9]+$')) {
    return NextResponse.json(
      'Invalid slug! Only alphanumeric characters and hyphens are allowed. No spaces.',
      {
        status: 400,
      },
    );
  }

  try {
    const slugCount = await db.shortLink.count({
      where: {
        slug: {
          equals: slug,
        },
      },
    });
    if (slugCount > 0) {
      return NextResponse.json('Slug already exists!', {
        status: 409,
      });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(JSON.stringify(err), {
      status: 500,
    });
  }

  //if not then store the slug and url in db

  try {
    const shortLink = await db.shortLink.create({
      data: {
        slug,
        redirectTo: url,
        params,
      },
    });
    return NextResponse.json(JSON.stringify(shortLink), {
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(JSON.stringify(err), {
      status: 500,
    });
  }
}
