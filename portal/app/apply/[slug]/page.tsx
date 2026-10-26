import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import {
  ApplyPage,
  type PublicOpening,
} from '@/components/screens/Apply/ApplyPage';
import { db } from '@/lib/mongodb/db-client';
import type { JobOpening } from '@/models/hiring';
import { JOB_OPENING_STATUS } from '@/models/hiring';
import type { Company } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

/** The opening and its company, as much as a candidate may see. */
const loadOpening = cache(
  async (slug: string): Promise<PublicOpening | null> => {
    const opening: JobOpening | null = await db.jobOpening.findFirst({
      where: { slug },
    });
    if (
      !opening ||
      opening.status === JOB_OPENING_STATUS.DRAFT ||
      opening.status === JOB_OPENING_STATUS.ARCHIVED
    )
      return null;
    const company: Company | null = await db.company.findFirst({
      where: { id: opening.companyId },
    });
    return {
      slug: opening.slug,
      title: opening.title,
      department: opening.department ?? null,
      location: opening.location ?? null,
      employmentType: opening.employmentType ?? null,
      description: opening.description ?? null,
      details: opening.details ?? null,
      isOpen: opening.status === JOB_OPENING_STATUS.OPEN,
      fields: opening.fields ?? [],
      company: {
        name: company?.name ?? 'The Moon Devs',
        logo: company?.logo ?? null,
        color: company?.color ?? null,
      },
    };
  },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const opening = await loadOpening(params.slug);
  if (!opening) return { title: 'Opening not found' };
  return {
    title: `${opening.title} · ${opening.company.name}`,
    description: `Apply for ${opening.title} at ${opening.company.name}.`,
  };
}

export default async function Apply({ params }: Props) {
  const opening = await loadOpening(params.slug);
  if (!opening) notFound();
  return <ApplyPage opening={opening} />;
}
