import { renderShareImage, SHARE_IMAGE_SIZES } from '@/lib/hiring/shareImage';
import { db } from '@/lib/mongodb/db-client';
import type { JobOpening } from '@/models/hiring';
import { JOB_OPENING_STATUS } from '@/models/hiring';

/*
 * The preview image LinkedIn, WhatsApp, Slack and others show when someone
 * shares an apply link: the share kit's wide "We're hiring" card.
 */

export const size = SHARE_IMAGE_SIZES.wide;
export const contentType = 'image/png';
export const alt = 'We’re hiring';
export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: { slug: string } }) {
  let opening: JobOpening | null = null;
  let company: string | null = null;
  try {
    const found: JobOpening | null = await db.jobOpening.findFirst({
      where: { slug: params.slug },
    });
    if (
      found &&
      found.status !== JOB_OPENING_STATUS.DRAFT &&
      found.status !== JOB_OPENING_STATUS.ARCHIVED
    ) {
      opening = found;
      const row = (await db.company.findFirst({
        where: { id: found.companyId },
        select: { name: true },
      })) as { name?: string } | null;
      company = row?.name ?? null;
    }
  } catch {
    // A preview card is better than none: fall back to the generic one.
  }
  return renderShareImage(
    opening ?? { title: 'Come build with us', slug: params.slug },
    company ?? 'The Moon Devs',
    'wide',
  );
}
