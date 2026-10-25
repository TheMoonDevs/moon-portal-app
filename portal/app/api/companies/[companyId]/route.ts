import { brandKitDefaults, sanitizeBrandKit } from '@/lib/brandKit';
import { db } from '@/lib/mongodb/db-client';
import { requireSuperAdmin } from '@/lib/permissions/server';
import {
  fail,
  nowIso,
  ok,
  pick,
  requireCompanyPermission,
} from '@/lib/workspace/server';
import { COMPANY_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { companyId: string } };

const EDITABLE = ['name', 'description', 'logo', 'color', 'brandKit'] as const;

export async function GET(_request: Request, { params }: Params) {
  const { response } = await requireCompanyPermission(
    params.companyId,
    'companies:read',
  );
  if (response) return response;
  const company = await db.company.findFirst({
    where: { id: params.companyId },
  });
  return ok({ company });
}

export async function PATCH(request: Request, { params }: Params) {
  const body = await request.json().catch(() => ({}));

  // Archiving or restoring a company is a super-admin action.
  if ('status' in body) {
    const { response } = await requireSuperAdmin();
    if (response) return response;
    if (!Object.values(COMPANY_STATUS).includes(body.status)) {
      return fail(400, 'Unknown company status.');
    }
  } else {
    const { response } = await requireCompanyPermission(
      params.companyId,
      'companies:edit',
    );
    if (response) return response;
  }

  const data: Record<string, unknown> = pick(body, EDITABLE);
  if ('status' in body) data.status = body.status;
  if (typeof data.name === 'string' && !data.name.trim()) {
    return fail(400, 'Company name is required.');
  }
  if ('brandKit' in data) {
    const kit = sanitizeBrandKit(data.brandKit);
    data.brandKit = kit;
    // A kit fills in the logo and color when the company has none yet.
    const current = await db.company.findFirst({
      where: { id: params.companyId },
    });
    const defaults = brandKitDefaults(kit);
    if (!(data.logo ?? current?.logo) && defaults.logo)
      data.logo = defaults.logo;
    if (!(data.color ?? current?.color) && defaults.color)
      data.color = defaults.color;
  }

  const company = await db.company.update({
    where: { id: params.companyId },
    data: { ...data, updatedAt: nowIso() },
  });
  return ok({ company });
}

/** Companies are archived, never hard-deleted, so worklogs keep their links. */
export async function DELETE(_request: Request, { params }: Params) {
  const { response } = await requireSuperAdmin();
  if (response) return response;
  const company = await db.company.update({
    where: { id: params.companyId },
    data: { status: COMPANY_STATUS.ARCHIVED, updatedAt: nowIso() },
  });
  return ok({ company });
}
