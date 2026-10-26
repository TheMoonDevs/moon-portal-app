import type { NextRequest } from 'next/server';

import { emailSettings } from '@/lib/hiring/email';
import { parseTemplateInput } from '@/lib/hiring/emailServer';
import { db } from '@/lib/mongodb/db-client';
import {
  fail,
  nowIso,
  ok,
  requireCompanyPermission,
} from '@/lib/workspace/server';
import type { HiringEmailTemplate } from '@/models/hiring';

export const dynamic = 'force-dynamic';

const MAX_TEMPLATES = 50;

/**
 * A company's saved email templates (`?companyId=`), and whether sending is
 * set up. The starter templates live in lib/hiring/emailTemplates.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const { response } = await requireCompanyPermission(companyId, 'hiring:read');
  if (response) return response;

  const templates: HiringEmailTemplate[] =
    await db.hiringEmailTemplate.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  const { configured, from, tracksDelivery } = emailSettings();
  return ok({ templates, sending: { configured, from, tracksDelivery } });
}

/** Saves a template: `{ companyId, name, subject, body, moveTo? }`. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const companyId = typeof body.companyId === 'string' ? body.companyId : null;
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:edit',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');

  const { data, error } = parseTemplateInput({
    name: body.name,
    subject: body.subject,
    body: body.body,
    moveTo: body.moveTo ?? null,
  });
  if (error) return fail(400, error);

  const count = await db.hiringEmailTemplate.count({ where: { companyId } });
  if (count >= MAX_TEMPLATES)
    return fail(400, `A company can keep up to ${MAX_TEMPLATES} templates.`);

  const now = nowIso();
  const template: HiringEmailTemplate = await db.hiringEmailTemplate.create({
    data: {
      ...data,
      companyId,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    },
  });
  return ok({ template }, { status: 201 });
}
