import { courseView, setLessonDone } from '@/lib/courses/server';
import { db } from '@/lib/mongodb/db-client';
import { onboardingFailure } from '@/lib/onboarding/http';
import { requireInCompany } from '@/lib/onboarding/server';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';
import type { Course } from '@/models/onboarding';

export const dynamic = 'force-dynamic';

/** Marks a lesson done or not done: `{ lessonId, done }`. */
export async function POST(
  request: Request,
  { params }: { params: { courseId: string } },
) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  if (typeof body.lessonId !== 'string')
    return fail(400, 'lessonId is required.');
  try {
    const course: Course | null = await db.course.findFirst({
      where: { id: params.courseId },
    });
    if (!course) return fail(404, 'Course not found.');
    await requireInCompany(actor, course.companyId, 'companies:read');
    await setLessonDone(course, actor.id, body.lessonId, body.done !== false);
    return ok({ course: await courseView(course, actor.id) });
  } catch (e) {
    if (e instanceof Error && e.message.includes('lesson'))
      return fail(404, e.message);
    return onboardingFailure(e);
  }
}
