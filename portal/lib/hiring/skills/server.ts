import { db } from '@/lib/mongodb/db-client';
import { nowIso } from '@/lib/workspace/server';
import type { HiringSkill } from '@/models/hiring';

import { BUILT_IN_SKILLS } from './builtIn';
import {
  type HiringSkillView,
  MAX_SKILL_BODY,
  MAX_SKILL_TIPS,
  MAX_SKILLS,
  parseSkill,
} from './index';

/** The company's skills: its own, then the built-ins it hasn't replaced. */
export async function listHiringSkills(
  companyId: string,
): Promise<HiringSkillView[]> {
  const saved: HiringSkill[] = await db.hiringSkill.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  });
  const own: HiringSkillView[] = saved.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    body: s.body,
    tips: s.tips ?? null,
    builtIn: false,
    updatedAt: (s.updatedAt as string | undefined) ?? null,
    updatedById: s.updatedById ?? s.createdById,
  }));
  const builtIn: HiringSkillView[] = BUILT_IN_SKILLS.map((b) => {
    const { name, description } = parseSkill(b.body);
    return {
      id: null,
      name,
      description,
      body: b.body,
      tips: b.tips,
      builtIn: true,
    };
  }).filter((b) => !own.some((s) => s.name === b.name));
  return [...own, ...builtIn];
}

export class SkillError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Saves a skill from its SKILL.md. One with the same name is replaced, so
 * saving is also how a skill is updated (or a built-in customised).
 */
export async function saveHiringSkill(
  companyId: string,
  userId: string,
  input: { body: unknown; tips?: unknown },
): Promise<{ skill: HiringSkill; created: boolean }> {
  const body =
    typeof input.body === 'string'
      ? input.body.replace(/\r\n/g, '\n').trim()
      : '';
  if (!body) throw new SkillError(400, 'Paste the SKILL.md first.');
  if (body.length > MAX_SKILL_BODY)
    throw new SkillError(400, 'That skill is too long to keep here.');
  const { name, description, error } = parseSkill(body);
  if (error) throw new SkillError(400, error);
  const tips =
    typeof input.tips === 'string'
      ? input.tips.trim().slice(0, MAX_SKILL_TIPS) || null
      : undefined;

  const now = nowIso();
  const existing: HiringSkill | null = await db.hiringSkill.findFirst({
    where: { companyId, name },
  });
  if (existing) {
    const skill: HiringSkill = await db.hiringSkill.update({
      where: { id: existing.id },
      data: {
        description,
        body: `${body}\n`,
        ...(tips !== undefined && { tips }),
        updatedById: userId,
        updatedAt: now,
      },
    });
    return { skill, created: false };
  }
  if ((await db.hiringSkill.count({ where: { companyId } })) >= MAX_SKILLS)
    throw new SkillError(
      400,
      `A company can keep up to ${MAX_SKILLS} skills here.`,
    );
  const skill: HiringSkill = await db.hiringSkill.create({
    data: {
      companyId,
      name,
      description,
      body: `${body}\n`,
      tips: tips ?? null,
      createdById: userId,
      updatedById: userId,
      createdAt: now,
      updatedAt: now,
    },
  });
  return { skill, created: true };
}
