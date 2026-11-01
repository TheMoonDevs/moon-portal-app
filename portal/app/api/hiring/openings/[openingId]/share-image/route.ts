import type { NextRequest } from 'next/server';

import { requireOpeningPermission } from '@/lib/hiring/server';
import { renderShareImage } from '@/lib/hiring/shareImage';
import { db } from '@/lib/mongodb/db-client';
import { fail } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { openingId: string } };

/**
 * The share kit's image for an opening: "We're hiring" with the role, its
 * facts and the company, as a PNG. `?format=square` (Instagram, WhatsApp,
 * the default) or `wide` (LinkedIn).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { response, opening } = await requireOpeningPermission(
    params.openingId,
    'hiring:read',
  );
  if (response || !opening)
    return response ?? fail(401, 'Authentication required.');

  const format =
    request.nextUrl.searchParams.get('format') === 'wide' ? 'wide' : 'square';
  const company = (await db.company.findFirst({
    where: { id: opening.companyId },
    select: { name: true },
  })) as { name?: string } | null;
  return renderShareImage(opening, company?.name ?? '', format);
}
