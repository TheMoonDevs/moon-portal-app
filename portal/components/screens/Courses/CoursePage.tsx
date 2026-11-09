'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DocProse } from '@/components/shared/DocProse';
import type { CourseView } from '@/lib/courses/server';
import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

const Symbol = ({ name, className }: { name: string; className?: string }) => (
  <span
    aria-hidden
    className={cn('material-symbols-outlined leading-none', className)}
  >
    {name}
  </span>
);

type Loaded = { course: CourseView; companyName: string; canEdit: boolean };

/** A course to read through, one lesson at a time, with progress kept. */
export const CoursePage = ({ courseId }: { courseId: string }) => {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    PortalSdk.getData(`/api/courses/${courseId}`, null)
      .then((res) => {
        const loaded: Loaded = res.data;
        setData(loaded);
        const { lessons, doneLessonIds } = loaded.course;
        setActive(
          (lessons.find((l) => !doneLessonIds.includes(l.id)) ?? lessons[0])
            ?.id ?? null,
        );
      })
      .catch((err) =>
        setError(
          err?.response?.data?.error || 'This course could not be opened.',
        ),
      );
  }, [courseId]);

  if (error)
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-6 text-center">
        <div>
          <h1 className="text-xl font-bold">{error}</h1>
          <Link
            href="/"
            className="mt-3 inline-block text-sm font-semibold underline underline-offset-4"
          >
            Go home
          </Link>
        </div>
      </main>
    );
  if (!data)
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <span className="size-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800" />
      </main>
    );

  const { course, companyName, canEdit } = data;
  const lessons = course.lessons;
  const index = lessons.findIndex((l) => l.id === active);
  const lesson = lessons[index] ?? null;
  const done = course.doneLessonIds.filter((id) =>
    lessons.some((l) => l.id === id),
  ).length;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const isDone = !!lesson && course.doneLessonIds.includes(lesson.id);

  const mark = async (value: boolean) => {
    if (!lesson) return;
    setSaving(true);
    try {
      const res = await PortalSdk.postData(
        `/api/courses/${course.id}/progress`,
        {
          lessonId: lesson.id,
          done: value,
        },
      );
      setData({ ...data, course: res.data.course });
      if (value && lessons[index + 1]) {
        setActive(lessons[index + 1].id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      toast.error('Could not save your progress. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5] pb-24 text-zinc-800">
      <div className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:py-8">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <Symbol name="school" className="text-[16px]" />
            {companyName} · Course
            {canEdit && (
              <Link
                href={`/hiring?view=courses&company=${course.companyId}&course=${course.id}`}
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-zinc-700 hover:bg-zinc-200"
              >
                <Symbol name="edit" className="text-[14px]" /> Edit course
              </Link>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
              {course.title}
            </h1>
            {course.description && (
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-zinc-600">
                {course.description}
              </p>
            )}
          </div>
          {lessons.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    pct === 100 ? 'bg-emerald-500' : 'bg-zinc-900',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-zinc-600">
                {pct === 100
                  ? 'Completed'
                  : `${done} of ${lessons.length} done`}
              </span>
            </div>
          )}
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md px-4 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Symbol name="edit_note" className="text-[28px]" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-zinc-900">
            This course is being written
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Lessons will show up here soon. Until then, ask your lead or buddy
            anything about using the portal, and remember to write a worklog
            every day.
          </p>
          {canEdit && (
            <Link
              href={`/hiring?view=courses&company=${course.companyId}&course=${course.id}`}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white"
            >
              <Symbol name="edit" className="text-[18px]" /> Write the first
              lesson
            </Link>
          )}
        </div>
      ) : (
        <div className="mx-auto mt-6 grid max-w-5xl gap-6 px-4 md:grid-cols-[240px_minmax(0,1fr)]">
          <nav
            className="flex gap-2 overflow-x-auto md:flex-col md:gap-1"
            aria-label="Lessons"
          >
            {lessons.map((l, i) => {
              const ok = course.doneLessonIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setActive(l.id)}
                  className={cn(
                    'flex min-w-[180px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors md:min-w-0',
                    l.id === active
                      ? 'bg-white font-semibold text-zinc-950 shadow-sm ring-1 ring-black/5'
                      : 'text-zinc-600 hover:bg-white/70',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                      ok
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-200 text-zinc-600',
                    )}
                  >
                    {ok ? (
                      <Symbol name="check" className="text-[14px]" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="truncate">{l.title}</span>
                </button>
              );
            })}
          </nav>

          {lesson && (
            <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Lesson {index + 1} of {lessons.length}
              </p>
              <h2 className="mb-4 mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                {lesson.title}
              </h2>
              <DocProse
                markdown={lesson.body || '_Nothing here yet._'}
                tone="light"
              />
              <div className="mt-10 flex flex-col-reverse gap-2 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={index <= 0}
                  onClick={() => setActive(lessons[index - 1].id)}
                  className="inline-flex h-11 items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 disabled:invisible"
                >
                  <Symbol name="arrow_back" className="text-[18px]" /> Previous
                </button>
                {isDone ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => mark(false)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200"
                  >
                    <Symbol name="check_circle" className="text-[18px]" /> Done
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => mark(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {index < lessons.length - 1
                      ? 'Done, next lesson'
                      : 'Finish the course'}
                    <Symbol name="arrow_forward" className="text-[18px]" />
                  </button>
                )}
              </div>
            </article>
          )}
        </div>
      )}
    </main>
  );
};
