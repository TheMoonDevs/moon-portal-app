/*
 * Required documents: what each role must have signed (an NDA for everyone,
 * the IT policy for interns). Client-safe: the rules and how a document
 * meets one. lib/agreements/compliance puts them against everyone's files.
 */
import type { RequiredDocument } from '@/models/agreements';
import { ONBOARDING_DOC_KIND } from '@/models/onboarding';

import { DOC_TYPE_KEYS, docTypeLabel, onboardingTypeKey } from './docTypes';

export const MAX_REQUIRED = 30;

/** Until a company sets its own: everyone has an NDA on file. */
export const DEFAULT_REQUIRED: RequiredDocument[] = [
  {
    id: 'nda',
    label: 'Non-Disclosure Agreement',
    typeKey: 'NDA',
    templateId: 'starter:mutual-nda',
    rolloutId: null,
    roles: [],
    blocking: false,
  },
];

const ONBOARDING_NDA = onboardingTypeKey(ONBOARDING_DOC_KIND.NDA);

/** NDAs from onboarding and from Agreements count as the same thing. */
export const sameType = (a: string, b: string) =>
  a === b ||
  ((a === 'NDA' || a === ONBOARDING_NDA) &&
    (b === 'NDA' || b === ONBOARDING_NDA));

export function parseRequired(raw: unknown): RequiredDocument[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  const out: RequiredDocument[] = [];
  for (const r of raw.slice(0, MAX_REQUIRED)) {
    if (!r || typeof r !== 'object') continue;
    const x = r as Record<string, unknown>;
    const typeKey = DOC_TYPE_KEYS.includes(x.typeKey as string)
      ? (x.typeKey as string)
      : null;
    const templateId =
      typeof x.templateId === 'string' &&
      /^(starter:[\w-]{1,40}|[a-f0-9]{24})$/i.test(x.templateId)
        ? x.templateId
        : null;
    const rolloutId =
      typeof x.rolloutId === 'string' && /^[a-f0-9]{24}$/i.test(x.rolloutId)
        ? x.rolloutId
        : null;
    if (
      !typeKey &&
      !rolloutId &&
      !(templateId && !templateId.startsWith('starter:'))
    )
      continue;
    let id =
      typeof x.id === 'string' && /^[\w-]{1,40}$/.test(x.id)
        ? x.id
        : Math.random().toString(36).slice(2, 10);
    while (used.has(id)) id = `${id}x`;
    used.add(id);
    const label =
      typeof x.label === 'string' && x.label.trim()
        ? x.label.trim().slice(0, 80)
        : typeKey
          ? docTypeLabel(typeKey)
          : 'Document';
    out.push({
      id,
      label,
      typeKey,
      templateId,
      rolloutId,
      roles: Array.isArray(x.roles)
        ? Array.from(
            new Set(
              x.roles
                .filter((k): k is string => typeof k === 'string')
                .map((k) => k.trim().slice(0, 40))
                .filter(Boolean),
            ),
          ).slice(0, 20)
        : [],
      blocking: x.blocking === true,
    });
  }
  return out;
}

/**
 * Whether a requirement applies to someone with these company roles. One for
 * everyone leaves out the owners: they are the company, and sign for it.
 */
export const appliesTo = (req: RequiredDocument, roleKeys: string[]) =>
  req.roles.length
    ? req.roles.some((r) => roleKeys.includes(r))
    : !roleKeys.includes('owner');

/**
 * Whether a document meets a requirement: one from its rollout or its own
 * template when it names one, otherwise any document of its type.
 */
export function meets(
  req: RequiredDocument,
  row: {
    typeKey: string;
    templateId?: string | null;
    rolloutId?: string | null;
  },
) {
  const ownTemplate =
    req.templateId && !req.templateId.startsWith('starter:')
      ? req.templateId
      : null;
  if (req.rolloutId || ownTemplate)
    return (
      (!!req.rolloutId && row.rolloutId === req.rolloutId) ||
      (!!ownTemplate && row.templateId === ownTemplate)
    );
  return !!req.typeKey && sameType(row.typeKey, req.typeKey);
}

export type RequirementState = 'signed' | 'waiting' | 'missing';

/** Requirements that can be sent from Agreements (not onboarding-only ones). */
export const isSendable = (req: RequiredDocument) =>
  !!req.templateId || !!req.rolloutId;
