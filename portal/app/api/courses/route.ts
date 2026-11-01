import {
  courseView,
  ensureIntroCourse,
  parseCourseInput,
} from '@/lib/courses/server';
import { db } from '@/lib/mongodb/db-client';
import { onboardingFailure } from '@/lib/onboarding/http';
import { requireInCompany } from '@/lib/onboarding/server';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, nowIso, ok } from '@/lib/workspace/server';
import type { Course } from '@/models/onboarding';

export const dynamic = 'force-dynamic';

/** A company's courses, the intro course first (made empty if missing). */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const companyId = new URL(request.url).searchParams.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  try {
    await requireInCompany(actor, companyId, 'companies:read');
    await ensureIntroCourse(companyId, actor.id);
    const courses: Course[] = await db.course.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
    courses.sort((a, b) => Number(!!b.isIntro) - Number(!!a.isIntro));
    return ok({
      courses: await Promise.all(courses.map((c) => courseView(c, actor.id))),
    });
  } catch (e) {
    return onboardingFailure(e);
  }
}

/** A new course: `{ companyId, title, description?, lessons? }`. */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  if (typeof body.companyId !== 'string')
    return fail(400, 'companyId is required.');
  const { data, error } = parseCourseInput({ lessons: [], ...body });
  if (error) return fail(400, error);
  if (!data.title) return fail(400, 'Give the course a title.');
  try {
    await requireInCompany(actor, body.companyId, 'courses:create');
    const now = nowIso();
    const course: Course = await db.course.create({
      data: {
        companyId: body.companyId,
        title: data.title,
        description: data.description ?? null,
        isIntro: false,
        lessons: data.lessons ?? [],
        createdById: actor.id,
        updatedById: actor.id,
        createdAt: now,
        updatedAt: now,
      },
    });
    return ok({ course: await courseView(course, actor.id) });
  } catch (e) {
    return onboardingFailure(e);
  }
}
