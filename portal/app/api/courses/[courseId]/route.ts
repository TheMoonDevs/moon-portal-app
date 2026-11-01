import { courseView, parseCourseInput } from '@/lib/courses/server';
import { db } from '@/lib/mongodb/db-client';
import { onboardingFailure } from '@/lib/onboarding/http';
import { OnboardingError, requireInCompany } from '@/lib/onboarding/server';
import { isAllowedInCompany } from '@/lib/permissions/company';
import { getSessionUser, type SessionUser } from '@/lib/permissions/server';
import { fail, nowIso, ok } from '@/lib/workspace/server';
import type { Course } from '@/models/onboarding';

export const dynamic = 'force-dynamic';

type Params = { params: { courseId: string } };

async function load(actor: SessionUser, courseId: string, permission: string) {
  const course: Course | null = await db.course.findFirst({
    where: { id: courseId },
  });
  if (!course) throw new OnboardingError(404, 'Course not found.');
  const access = await requireInCompany(actor, course.companyId, permission);
  return { course, access };
}

/** A course to take, with the reader's progress and whether they may edit. */
export async function GET(_: Request, { params }: Params) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  try {
    const { course, access } = await load(
      actor,
      params.courseId,
      'companies:read',
    );
    const company = await db.company.findFirst({
      where: { id: course.companyId },
    });
    return ok({
      course: await courseView(course, actor.id),
      companyName: company?.name ?? '',
      canEdit: isAllowedInCompany(actor, access, 'courses:edit'),
    });
  } catch (e) {
    return onboardingFailure(e);
  }
}

/** Edits a course: `{ title?, description?, lessons? }`. */
export async function PATCH(request: Request, { params }: Params) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  const { data, error } = parseCourseInput(body);
  if (error) return fail(400, error);
  try {
    const { course } = await load(actor, params.courseId, 'courses:edit');
    const updated: Course = await db.course.update({
      where: { id: course.id },
      data: { ...data, updatedById: actor.id, updatedAt: nowIso() },
    });
    return ok({ course: await courseView(updated, actor.id) });
  } catch (e) {
    return onboardingFailure(e);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  try {
    const { course } = await load(actor, params.courseId, 'courses:delete');
    if (course.isIntro)
      return fail(
        409,
        'New hires get this course with their sign-in. Edit it instead.',
      );
    await db.course.delete({ where: { id: course.id } });
    await db.courseProgress.deleteMany({ where: { courseId: course.id } });
    return ok({ deleted: true });
  } catch (e) {
    return onboardingFailure(e);
  }
}
