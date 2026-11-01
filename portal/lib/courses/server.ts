import { randomBytes } from 'crypto';

import { db } from '@/lib/mongodb/db-client';
import { nowIso } from '@/lib/workspace/server';
import type { Course, CourseLesson } from '@/models/onboarding';

export const MAX_COURSE_TITLE = 120;
export const MAX_COURSE_DESCRIPTION = 600;
export const MAX_LESSONS = 60;
export const MAX_LESSON_TITLE = 160;
export const MAX_LESSON_BODY = 40000;

/** The course every new hire gets with their sign-in, before it is written. */
export const INTRO_COURSE = {
  title: 'Portal usage and guidance',
  description:
    'How we work in the Portal: worklogs every day, projects and tasks, and setting up Claude once you are fully hired.',
};

export const lessonId = () => randomBytes(6).toString('hex');

/** The company's intro course, made empty the first time it is needed. */
export async function ensureIntroCourse(
  companyId: string,
  byUserId: string,
): Promise<Course> {
  const found: Course | null = await db.course.findFirst({
    where: { companyId, isIntro: true },
  });
  if (found) return found;
  const now = nowIso();
  return db.course.create({
    data: {
      companyId,
      title: INTRO_COURSE.title,
      description: INTRO_COURSE.description,
      isIntro: true,
      lessons: [],
      createdById: byUserId,
      updatedById: null,
      createdAt: now,
      updatedAt: now,
    },
  });
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/** The editable parts of a course from an untrusted body. */
export function parseCourseInput(body: Record<string, unknown>): {
  data: Partial<Course>;
  error: string | null;
} {
  const data: Partial<Course> = {};
  if ('title' in body) {
    data.title = text(body.title, MAX_COURSE_TITLE);
    if (!data.title) return { data, error: 'Give the course a title.' };
  }
  if ('description' in body)
    data.description = text(body.description, MAX_COURSE_DESCRIPTION) || null;
  if ('lessons' in body) {
    if (!Array.isArray(body.lessons))
      return { data, error: 'Lessons must be a list.' };
    if (body.lessons.length > MAX_LESSONS)
      return { data, error: `A course can have up to ${MAX_LESSONS} lessons.` };
    const seen = new Set<string>();
    const lessons: CourseLesson[] = [];
    for (const raw of body.lessons as Array<Record<string, unknown>>) {
      if (!raw || typeof raw !== 'object') continue;
      const title = text(raw.title, MAX_LESSON_TITLE);
      if (!title) return { data, error: 'Every lesson needs a title.' };
      let id = typeof raw.id === 'string' ? raw.id.slice(0, 24) : '';
      if (!/^[a-z0-9]{6,24}$/.test(id) || seen.has(id)) id = lessonId();
      seen.add(id);
      lessons.push({
        id,
        title,
        body:
          typeof raw.body === 'string'
            ? raw.body.slice(0, MAX_LESSON_BODY)
            : '',
      });
    }
    data.lessons = lessons;
  }
  return { data, error: null };
}

/** A course as people see it, with how far `userId` got. */
export async function courseView(course: Course, userId: string | null) {
  const progress = userId
    ? await db.courseProgress.findFirst({
        where: { courseId: course.id, userId },
      })
    : null;
  return {
    id: course.id,
    companyId: course.companyId,
    title: course.title,
    description: course.description ?? null,
    isIntro: !!course.isIntro,
    lessons: course.lessons ?? [],
    updatedAt: course.updatedAt ?? null,
    doneLessonIds: (progress?.doneLessonIds ?? []) as string[],
    completedAt: (progress?.completedAt ?? null) as string | null,
  };
}

export type CourseView = Awaited<ReturnType<typeof courseView>>;

/** Marks a lesson done (or not) for someone. */
export async function setLessonDone(
  course: Course,
  userId: string,
  lesson: string,
  done: boolean,
) {
  if (!(course.lessons ?? []).some((l) => l.id === lesson))
    throw new Error('That lesson is not in this course.');
  const now = nowIso();
  const existing = await db.courseProgress.findFirst({
    where: { courseId: course.id, userId },
  });
  const before: string[] = existing?.doneLessonIds ?? [];
  const ids = done
    ? Array.from(new Set([...before, lesson]))
    : before.filter((id) => id !== lesson);
  const all = (course.lessons ?? []).every((l) => ids.includes(l.id));
  const completedAt =
    all && course.lessons.length ? (existing?.completedAt ?? now) : null;
  if (existing)
    return db.courseProgress.update({
      where: { id: existing.id },
      data: { doneLessonIds: ids, completedAt, updatedAt: now },
    });
  return db.courseProgress.create({
    data: {
      courseId: course.id,
      companyId: course.companyId,
      userId,
      doneLessonIds: ids,
      completedAt,
      createdAt: now,
      updatedAt: now,
    },
  });
}
