import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { nowIso } from '@/lib/workspace/server';
import type {
  AgreementSettings,
  CompanySignerRule,
  SavedSignature,
} from '@/models/agreements';
import {
  type Company,
  type CompanyMember,
  MEMBER_STATUS,
} from '@/models/workspace';

import { DOC_TYPE_KEYS, isSignerRule, mergeTypes } from './docTypes';

/*
 * Who signs for the company, and saved signatures.
 *
 * Each document type names a company signer: the owner (the one the company
 * picks, or its first owner), the hiring lead (or, for agreements, whoever
 * sends it), or nobody. The owner signs by hand once, which saves their
 * signature; after that every countersignature is one Approve click.
 */

export class SignerError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/* -------------------------------- settings -------------------------------- */

export async function getSettings(companyId: string) {
  const own: AgreementSettings | null = await db.agreementSettings.findFirst({
    where: { companyId },
  });
  return {
    companyId,
    signatoryId: (own?.signatoryId as string | null) ?? null,
    types: mergeTypes(own?.types),
    autoReminders: own?.autoReminders !== false,
  };
}

export type SigningSettings = Awaited<ReturnType<typeof getSettings>>;

export type PersonRef = { id: string; name: string; email: string | null };

/** Active owners of a company, longest-standing first. */
export async function companyOwners(companyId: string): Promise<PersonRef[]> {
  const members: CompanyMember[] = await db.companyMember.findMany({
    where: { companyId, status: MEMBER_STATUS.ACTIVE },
  });
  const owners = members
    .filter((m) => m.roleKeys?.includes('owner'))
    .sort((a, b) =>
      String(a.joinedAt ?? a.createdAt ?? '').localeCompare(
        String(b.joinedAt ?? b.createdAt ?? ''),
      ),
    );
  if (!owners.length) return [];
  const users = await db.user.findMany({
    where: { id: { in: owners.map((o) => o.userId) } },
    select: { id: true, name: true, email: true },
  });
  return owners
    .map((o) => users.find((u: { id: string }) => u.id === o.userId))
    .filter(Boolean)
    .map((u: any) => ({
      id: u.id,
      name: u.name || 'Owner',
      email: u.email ?? null,
    }));
}

/** The owner who signs for the company. */
export async function signatoryFor(
  companyId: string,
  settings?: SigningSettings,
): Promise<PersonRef | null> {
  const s = settings ?? (await getSettings(companyId));
  const owners = await companyOwners(companyId);
  const picked = owners.find((o) => o.id === s.signatoryId);
  if (picked) return picked;
  if (owners[0]) return owners[0];
  const company: Company | null = await db.company.findFirst({
    where: { id: companyId },
  });
  return company?.createdById ? personRef(company.createdById) : null;
}

export async function personRef(
  userId: string | null | undefined,
): Promise<PersonRef | null> {
  if (!userId) return null;
  const u = await db.user.findFirst({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  return u
    ? { id: u.id, name: u.name || 'Someone', email: u.email ?? null }
    : null;
}

export interface CompanySigner extends PersonRef {
  as: 'owner' | 'lead';
}

/**
 * The person who signs one document for the company under its type's rule,
 * or null when nobody does. `lead` is the hiring lead for onboarding and
 * whoever sends an agreement.
 */
export async function companySignerFor(
  companyId: string,
  typeKey: string,
  ctx: { leadId?: string | null },
  override?: CompanySignerRule | null,
): Promise<CompanySigner | null> {
  const settings = await getSettings(companyId);
  const rule = override ?? settings.types[typeKey]?.signer ?? 'owner';
  if (rule === 'none') return null;
  if (rule === 'lead') {
    const lead = await personRef(ctx.leadId);
    if (lead) return { ...lead, as: 'lead' };
  }
  const owner = await signatoryFor(companyId, settings);
  return owner ? { ...owner, as: 'owner' } : null;
}

export async function isConfidentialType(companyId: string, typeKey: string) {
  const settings = await getSettings(companyId);
  return !!settings.types[typeKey]?.confidential;
}

/** Saves a company's rules. The caller checks agreements:edit. */
export async function saveSettings(
  actor: SessionUser,
  companyId: string,
  raw: any,
) {
  const current = await getSettings(companyId);
  const types = { ...current.types };
  if (raw?.types && typeof raw.types === 'object')
    for (const key of DOC_TYPE_KEYS) {
      const t = raw.types[key];
      if (!t || typeof t !== 'object') continue;
      types[key] = {
        signer: isSignerRule(t.signer) ? t.signer : types[key].signer,
        confidential:
          typeof t.confidential === 'boolean'
            ? t.confidential
            : types[key].confidential,
      };
    }
  let signatoryId = current.signatoryId;
  if ('signatoryId' in (raw ?? {})) {
    const owners = await companyOwners(companyId);
    if (raw.signatoryId && !owners.some((o) => o.id === raw.signatoryId))
      throw new SignerError(400, 'The company signatory must be an owner.');
    signatoryId = raw.signatoryId || null;
  }
  const data = {
    companyId,
    signatoryId,
    types,
    autoReminders:
      typeof raw?.autoReminders === 'boolean'
        ? raw.autoReminders
        : current.autoReminders,
    updatedById: actor.id,
    updatedAt: nowIso(),
  };
  const found = await db.agreementSettings.findFirst({ where: { companyId } });
  if (found)
    await db.agreementSettings.update({ where: { id: found.id }, data });
  else
    await db.agreementSettings.create({
      data: { ...data, createdAt: data.updatedAt },
    });
  return settingsView(companyId);
}

/** The rules, with the owners to choose the signatory from. */
export async function settingsView(companyId: string) {
  const [settings, owners] = await Promise.all([
    getSettings(companyId),
    companyOwners(companyId),
  ]);
  const signatory = await signatoryFor(companyId, settings);
  const saved = signatory ? await getSavedSignature(signatory.id) : null;
  return {
    ...settings,
    owners,
    signatory: signatory ? { ...signatory, hasSavedSignature: !!saved } : null,
  };
}

export type SettingsView = Awaited<ReturnType<typeof settingsView>>;

/* ---------------------------- saved signatures ---------------------------- */

const SIGNATURE_IMAGE = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;
export const MAX_SIGNATURE_IMAGE = 200_000;

export function checkSignatureImage(image: unknown): string | null {
  if (typeof image !== 'string' || !image) return null;
  if (image.length > MAX_SIGNATURE_IMAGE || !SIGNATURE_IMAGE.test(image))
    throw new SignerError(400, 'The drawn signature could not be read.');
  return image;
}

export async function getSavedSignature(
  userId: string,
): Promise<SavedSignature | null> {
  return db.savedSignature.findFirst({ where: { userId } });
}

export const savedSignatureView = (s: SavedSignature | null) =>
  s
    ? {
        name: s.name,
        method: s.method,
        image: s.image ?? null,
        initials: s.initials ?? null,
        updatedAt: (s.updatedAt as string) ?? null,
      }
    : null;

export type SavedSignatureView = ReturnType<typeof savedSignatureView>;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .join('')
    .slice(0, 4);

export async function saveSignature(
  userId: string,
  raw: { name?: unknown; image?: unknown; initials?: unknown },
) {
  const name =
    typeof raw.name === 'string' ? raw.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2 || name.length > 120)
    throw new SignerError(400, 'Type your full name to sign with.');
  const image = checkSignatureImage(raw.image);
  const initials =
    typeof raw.initials === 'string' && raw.initials.trim()
      ? raw.initials.trim().slice(0, 4).toUpperCase()
      : initialsOf(name);
  const at = nowIso();
  const data = {
    userId,
    name,
    method: image ? ('drawn' as const) : ('typed' as const),
    image,
    initials,
    updatedAt: at,
  };
  const found = await getSavedSignature(userId);
  const saved: SavedSignature = found
    ? await db.savedSignature.update({ where: { id: found.id }, data })
    : await db.savedSignature.create({ data: { ...data, createdAt: at } });
  return savedSignatureView(saved);
}

export async function deleteSavedSignature(userId: string) {
  await db.savedSignature.deleteMany({ where: { userId } });
}
