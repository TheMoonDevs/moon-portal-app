'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DocProse } from '@/components/shared/DocProse';
import type { CourseView } from '@/lib/courses/server';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  CopyButton,
  EmptyState,
  Field,
  Icon,
  IconAction,
  Panel,
  Pill,
  Segmented,
  SkeletonRows,
  TextArea,
  TextInput,
} from '../shared/AdminUI';
import { CompanyPicker, errorText, NeedsCompany } from '../Workspace/shared';

type Lesson = { id: string; title: string; body: string };

const newLesson = (): Lesson => ({
  id: Math.random().toString(36).slice(2, 10),
  title: 'New lesson',
  body: '',
});

/** Writes one course: its title, description and lessons, in order. */
const CourseEditor = ({
  course,
  onSaved,
  onDeleted,
}: {
  course: CourseView;
  onSaved: (course: CourseView) => void;
  onDeleted: () => void;
}) => {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? '');
  const [lessons, setLessons] = useState<Lesson[]>(course.lessons);
  const [active, setActive] = useState<string | null>(
    course.lessons[0]?.id ?? null,
  );
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTitle(course.title);
    setDescription(course.description ?? '');
    setLessons(course.lessons);
    setActive((a) =>
      course.lessons.some((l) => l.id === a)
        ? a
        : (course.lessons[0]?.id ?? null),
    );
  }, [course]);

  const lesson = lessons.find((l) => l.id === active) ?? null;
  const dirty =
    title !== course.title ||
    description !== (course.description ?? '') ||
    JSON.stringify(lessons) !== JSON.stringify(course.lessons);

  const edit = (patch: Partial<Lesson>) =>
    setLessons((all) =>
      all.map((l) => (l.id === active ? { ...l, ...patch } : l)),
    );
  const move = (id: string, by: number) =>
    setLessons((all) => {
      const i = all.findIndex((l) => l.id === id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const res = await PortalSdk.patchData(`/api/courses/${course.id}`, {
        title,
        description,
        lessons,
      });
      onSaved(res.data.course);
      toast.success('Course saved');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await PortalSdk.deleteData(`/api/courses/${course.id}`, null);
      onDeleted();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/courses/${course.id}`
      : '';

  return (
    <Panel className="flex min-w-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 min-w-0 flex-1 text-base font-semibold"
          />
          {course.isIntro && (
            <Pill tone="info" icon="how_to_reg">
              Sent to new hires
            </Pill>
          )}
          <CopyButton value={link} label="Copy the course link" />
          <a href={`/courses/${course.id}`} target="_blank" rel="noreferrer">
            <IconAction icon="open_in_new" label="Open as a learner" />
          </a>
          {!course.isIntro && (
            <IconAction
              icon="delete"
              label="Delete course"
              tone="danger"
              onClick={() => setConfirmDelete(true)}
            />
          )}
        </div>
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this course is for, in a line or two"
          className="min-h-[56px]"
        />
      </div>

      <div className="grid min-h-[480px] md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="flex flex-col gap-1 border-b border-white/[0.07] p-3 md:border-b-0 md:border-r">
          {lessons.map((l, i) => (
            <div
              key={l.id}
              className={cn(
                'group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
                l.id === active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-400 hover:bg-white/[0.04]',
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] text-neutral-400">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => setActive(l.id)}
                className="min-w-0 flex-1 truncate text-left"
              >
                {l.title || 'Untitled'}
              </button>
              <span className="hidden gap-0.5 group-hover:flex">
                <button
                  type="button"
                  aria-label="Move up"
                  onClick={() => move(l.id, -1)}
                  className="text-neutral-500 hover:text-white"
                >
                  <Icon name="arrow_upward" className="text-[14px]" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  onClick={() => move(l.id, 1)}
                  className="text-neutral-500 hover:text-white"
                >
                  <Icon name="arrow_downward" className="text-[14px]" />
                </button>
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const l = newLesson();
              setLessons((all) => [...all, l]);
              setActive(l.id);
              setMode('write');
            }}
            className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-white/10 p-2 text-sm text-neutral-400 hover:border-white/25 hover:text-white"
          >
            <Icon name="add" className="text-[16px]" />
            Add a lesson
          </button>
        </div>

        <div className="flex min-w-0 flex-col">
          {lesson ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-3">
                <TextInput
                  value={lesson.title}
                  onChange={(e) => edit({ title: e.target.value })}
                  className="h-9 min-w-0 flex-1"
                />
                <Segmented
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'write', label: 'Write', icon: 'edit' },
                    { value: 'preview', label: 'Preview', icon: 'visibility' },
                  ]}
                />
                <IconAction
                  icon="delete"
                  label="Remove lesson"
                  tone="danger"
                  onClick={() => {
                    setLessons((all) => all.filter((l) => l.id !== lesson.id));
                    setActive(
                      lessons.find((l) => l.id !== lesson.id)?.id ?? null,
                    );
                  }}
                />
              </div>
              {mode === 'write' ? (
                <textarea
                  value={lesson.body}
                  onChange={(e) => edit({ body: e.target.value })}
                  placeholder={
                    'Write in Markdown.\n\n## A heading\n\n- A point\n- Another point\n\n[A link](https://…)'
                  }
                  className="custom-scrollbar min-h-[420px] flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-neutral-200 placeholder:text-neutral-700 focus:outline-none"
                />
              ) : (
                <div className="custom-scrollbar max-h-[560px] overflow-y-auto p-5">
                  <h2 className="mb-3 text-xl font-semibold text-white">
                    {lesson.title}
                  </h2>
                  <DocProse
                    markdown={lesson.body || '_Nothing written yet._'}
                    tone="dark"
                  />
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon="edit_note"
              title={
                course.isIntro ? 'This course is still empty' : 'No lessons yet'
              }
              description={
                course.isIntro
                  ? 'New hires get a link to it with their sign-in. Add lessons on worklogs, projects, and setting up Claude once fully hired. You can also ask Claude to write it with you.'
                  : 'Add a lesson to start.'
              }
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] px-4 py-3">
        <span className="text-xs text-neutral-500">
          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
          {dirty ? ' · unsaved changes' : ''}
        </span>
        <AdminButton
          tone="primary"
          size="sm"
          icon="save"
          loading={saving}
          disabled={!dirty}
          onClick={save}
        >
          Save course
        </AdminButton>
      </div>

      <AdminModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this course?"
        icon="delete"
        size="sm"
        footer={
          <>
            <AdminButton
              tone="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton tone="danger" size="sm" icon="delete" onClick={remove}>
              Delete
            </AdminButton>
          </>
        }
      >
        <p className="text-sm text-neutral-400">
          Its lessons and everyone’s progress go with it.
        </p>
      </AdminModal>
    </Panel>
  );
};

/** Admin > Courses: a company's courses, the Portal course first. */
export const AdminCourses = ({
  selectedCompanyId,
  onSelectCompany,
}: {
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
}) => {
  const { companies, can } = useWorkspace();
  const editable = companies.filter((c) => can(c.company.id, 'courses:edit'));
  const companyId = editable.some((c) => c.company.id === selectedCompanyId)
    ? selectedCompanyId
    : (editable[0]?.company.id ?? null);

  const [courses, setCourses] = useState<CourseView[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/courses?companyId=${companyId}`,
        null,
      );
      const list: CourseView[] = res?.data?.courses ?? [];
      setCourses(list);
      setActiveId((a) =>
        list.some((c) => c.id === a) ? a : (list[0]?.id ?? null),
      );
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      const res = await PortalSdk.postData('/api/courses', {
        companyId,
        title: newTitle,
      });
      setCourses((all) => [...all, res.data.course]);
      setActiveId(res.data.course.id);
      setCreating(false);
      setNewTitle('');
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  if (!companyId)
    return <NeedsCompany text="Courses are written by company owners." />;
  const active = courses.find((c) => c.id === activeId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <CompanyPicker
          companies={editable}
          value={companyId}
          onChange={onSelectCompany}
        />
        <div className="flex-1" />
        <AdminButton
          tone="primary"
          icon="add"
          onClick={() => setCreating(true)}
        >
          New course
        </AdminButton>
      </div>

      {loading && !courses.length ? (
        <Panel>
          <SkeletonRows rows={3} />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="flex gap-2 overflow-x-auto lg:flex-col">
            {courses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={cn(
                  'flex min-w-[200px] flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors',
                  c.id === activeId
                    ? 'border-white/20 bg-white/[0.07]'
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-white">
                  <Icon
                    name={c.isIntro ? 'how_to_reg' : 'school'}
                    className="text-[16px] text-neutral-400"
                  />
                  <span className="truncate">{c.title}</span>
                </span>
                <span className="text-[11px] text-neutral-500">
                  {c.lessons.length
                    ? `${c.lessons.length} lessons`
                    : 'Empty, to write'}
                  {c.isIntro ? ' · new hires' : ''}
                </span>
              </button>
            ))}
          </div>
          {active && (
            <CourseEditor
              key={active.id}
              course={active}
              onSaved={(c) =>
                setCourses((all) => all.map((x) => (x.id === c.id ? c : x)))
              }
              onDeleted={() => {
                setCourses((all) => all.filter((x) => x.id !== active.id));
                setActiveId(null);
              }}
            />
          )}
        </div>
      )}

      <AdminModal
        open={creating}
        onOpenChange={setCreating}
        title="New course"
        icon="school"
        size="sm"
        footer={
          <>
            <AdminButton
              tone="ghost"
              size="sm"
              onClick={() => setCreating(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              disabled={!newTitle.trim()}
              onClick={create}
            >
              Create
            </AdminButton>
          </>
        }
      >
        <Field label="Title">
          <TextInput
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
        </Field>
      </AdminModal>
    </div>
  );
};
