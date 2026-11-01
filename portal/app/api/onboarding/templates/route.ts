import { db } from '@/lib/mongodb/db-client';
import {
  DEFAULT_DOCUMENTS,
  MAX_DOC_BODY,
  MAX_DOC_TITLE,
} from '@/lib/onboarding/documents';
import { onboardingFailure } from '@/lib/onboarding/http';
import { DOC_LABEL } from '@/lib/onboarding/meta';
import { requireInCompany } from '@/lib/onboarding/server';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, nowIso, ok } from '@/lib/workspace/server';
import {
  ONBOARDING_DOC_KIND,
  type OnboardingTemplate,
} from '@/models/onboarding';

export const dynamic = 'force-dynamic';

const KINDS = Object.values(ONBOARDING_DOC_KIND);
const isKind = (v: unknown): v is ONBOARDING_DOC_KIND =>
  KINDS.includes(v as ONBOARDING_DOC_KIND);

/** Every onboarding document for a company: its own wording or the draft. */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const companyId = new URL(request.url).searchParams.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  try {
    await requireInCompany(actor, companyId, 'hiring:read');
    const own: OnboardingTemplate[] = await db.onboardingTemplate.findMany({
      where: { companyId },
    });
    return ok({
      templates: KINDS.map((kind) => {
        const t = own.find((o) => o.kind === kind);
        return {
          kind,
          label: DOC_LABEL[kind],
          title: t?.title ?? DEFAULT_DOCUMENTS[kind].title,
          body: t?.body ?? DEFAULT_DOCUMENTS[kind].body,
          custom: !!t,
          updatedAt: t?.updatedAt ?? null,
        };
      }),
    });
  } catch (e) {
    return onboardingFailure(e);
  }
}

/** Saves a company's wording: `{ companyId, kind, title, body }`. */
export async function PUT(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  if (typeof body.companyId !== 'string' || !isKind(body.kind))
    return fail(400, 'companyId and kind are required.');
  const title =
    typeof body.title === 'string'
      ? body.title.trim().slice(0, MAX_DOC_TITLE)
      : '';
  const text =
    typeof body.body === 'string' ? body.body.slice(0, MAX_DOC_BODY) : '';
  if (!title || !text.trim()) return fail(400, 'Add a title and the text.');
  try {
    await requireInCompany(actor, body.companyId, 'hiring:edit');
    const now = nowIso();
    const found: OnboardingTemplate | null =
      await db.onboardingTemplate.findFirst({
        where: { companyId: body.companyId, kind: body.kind },
      });
    if (found)
      await db.onboardingTemplate.update({
        where: { id: found.id },
        data: { title, body: text, updatedById: actor.id, updatedAt: now },
      });
    else
      await db.onboardingTemplate.create({
        data: {
          companyId: body.companyId,
          kind: body.kind,
          title,
          body: text,
          updatedById: actor.id,
          createdAt: now,
          updatedAt: now,
        },
      });
    return ok({ saved: true });
  } catch (e) {
    return onboardingFailure(e);
  }
}

/** Goes back to the built-in draft: `?companyId&kind`. */
export async function DELETE(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const params = new URL(request.url).searchParams;
  const companyId = params.get('companyId');
  const kind = params.get('kind');
  if (!companyId || !isKind(kind))
    return fail(400, 'companyId and kind are required.');
  try {
    await requireInCompany(actor, companyId, 'hiring:edit');
    await db.onboardingTemplate.deleteMany({ where: { companyId, kind } });
    return ok({ reset: true });
  } catch (e) {
    return onboardingFailure(e);
  }
}
