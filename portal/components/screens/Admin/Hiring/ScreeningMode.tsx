'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { QUICK_ACTION_TEMPLATES } from '@/lib/hiring/emailTemplates';
import { POOL_TAGS } from '@/lib/hiring/pool';
import { sourceLabel } from '@/lib/hiring/sources';
import { cn } from '@/lib/utils';
import {
  APPLICATION_STAGE,
  type ApplicationTag,
  FORM_FIELD_TYPE,
} from '@/models/hiring';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminButton, Icon, IconAction, Pill } from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { Answer } from './ApplicantDetail';
import { type ApplicationRow, type OpeningRow, timeAgo } from './hiringMeta';

type Decision = 'SHORTLIST' | 'TOP' | 'MAYBE' | 'REJECT' | 'KEEP' | 'SKIP';

const DECISIONS: Array<{
  value: Decision;
  label: string;
  key: string;
  icon: string;
  tone: string;
  hint: string;
}> = [
  {
    value: 'SHORTLIST',
    label: 'Shortlist',
    key: 'S',
    icon: 'star',
    tone: 'border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20',
    hint: 'Moves them to Shortlisted.',
  },
  {
    value: 'TOP',
    label: 'Top pick',
    key: 'T',
    icon: 'workspace_premium',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
    hint: 'Shortlisted and tagged Top pick.',
  },
  {
    value: 'MAYBE',
    label: 'Maybe',
    key: 'M',
    icon: 'help',
    tone: 'border-white/15 bg-white/[0.05] text-neutral-200 hover:bg-white/10',
    hint: 'Tagged Maybe and left in Applied.',
  },
  {
    value: 'REJECT',
    label: 'Reject',
    key: 'R',
    icon: 'block',
    tone: 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
    hint: 'Moves them to Rejected, without an email yet.',
  },
  {
    value: 'KEEP',
    label: 'Reject, keep on file',
    key: 'K',
    icon: 'inventory_2',
    tone: 'border-white/15 bg-white/[0.05] text-neutral-200 hover:bg-white/10',
    hint: 'Rejected, and kept in the Talent pool.',
  },
];

const RESULT: Record<
  Exclude<Decision, 'SKIP'>,
  { stage?: APPLICATION_STAGE; tag?: ApplicationTag }
> = {
  SHORTLIST: { stage: APPLICATION_STAGE.SHORTLISTED },
  TOP: { stage: APPLICATION_STAGE.SHORTLISTED, tag: 'TOP' },
  MAYBE: { tag: 'MAYBE' },
  REJECT: { stage: APPLICATION_STAGE.REJECTED },
  KEEP: { stage: APPLICATION_STAGE.REJECTED, tag: 'KEEP' },
};

type Done = {
  id: string;
  decision: Decision;
  before: Pick<ApplicationRow, 'stage' | 'tags'>;
};

/**
 * One applicant at a time, full screen: read their answers, then shortlist,
 * mark maybe or reject with a key, and go straight to the next. Ends with
 * the emails to send (the task to the shortlist, a note to the rejected).
 */
export const ScreeningMode = ({
  opening,
  applications,
  onClose,
  onUpdated,
  onCompose,
}: {
  opening: OpeningRow;
  /** Everyone in the opening; the walk takes those still in Applied. */
  applications: ApplicationRow[];
  onClose: () => void;
  onUpdated: (application: ApplicationRow) => void;
  onCompose: (ids: string[], templateId: string) => void;
}) => {
  // The line-up is fixed when screening starts, oldest application first.
  const [lineUp] = useState(() =>
    applications
      .filter((a) => a.stage === APPLICATION_STAGE.APPLIED)
      .sort(
        (a, b) =>
          new Date(String(a.submittedAt)).getTime() -
          new Date(String(b.submittedAt)).getTime(),
      )
      .map((a) => a.id),
  );
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Done[]>([]);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const byId = useMemo(
    () => new Map(applications.map((a) => [a.id, a])),
    [applications],
  );
  const current = index < lineUp.length ? byId.get(lineUp[index]) : null;
  const finished = index >= lineUp.length;

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [index]);

  const patch = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const res = await PortalSdk.patchData(
        `/api/hiring/applications/${id}`,
        body,
      );
      onUpdated(res.data.application);
      return res.data.application as ApplicationRow;
    },
    [onUpdated],
  );

  const decide = useCallback(
    async (decision: Decision) => {
      if (!current || busy) return;
      if (decision === 'SKIP') {
        setDone((d) => [...d, { id: current.id, decision, before: current }]);
        setIndex((i) => i + 1);
        return;
      }
      const { stage, tag } = RESULT[decision];
      const tags = current.tags ?? [];
      const body: Record<string, unknown> = {};
      if (tag && !tags.includes(tag)) body.tags = [...tags, tag];
      if (stage) body.stage = stage;
      setBusy(true);
      try {
        if (Object.keys(body).length) await patch(current.id, body);
        setDone((d) => [
          ...d,
          {
            id: current.id,
            decision,
            before: { stage: current.stage, tags: current.tags },
          },
        ]);
        setIndex((i) => i + 1);
      } catch (err) {
        toast.error(errorText(err));
      } finally {
        setBusy(false);
      }
    },
    [current, busy, patch],
  );

  const undo = useCallback(async () => {
    const last = done[done.length - 1];
    if (!last || busy) return;
    setBusy(true);
    try {
      if (last.decision !== 'SKIP')
        await patch(last.id, {
          stage: last.before.stage,
          tags: last.before.tags ?? [],
        });
      setDone((d) => d.slice(0, -1));
      setIndex((i) => Math.max(0, i - 1));
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }, [done, busy, patch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'escape') return onClose();
      if (key === 'z' || key === 'backspace' || key === 'arrowleft') {
        e.preventDefault();
        return void undo();
      }
      if (key === ' ' || key === 'arrowright' || key === 'j') {
        e.preventDefault();
        return void decide('SKIP');
      }
      const match = DECISIONS.find((d) => d.key.toLowerCase() === key);
      if (match) {
        e.preventDefault();
        void decide(match.value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide, undo, onClose]);

  const ids = (decisions: Decision[]) =>
    done.filter((d) => decisions.includes(d.decision)).map((d) => d.id);
  const shortlisted = ids(['SHORTLIST', 'TOP']);
  const rejected = ids(['REJECT', 'KEEP']);
  const maybes = ids(['MAYBE']);
  const skipped = ids(['SKIP']);

  const fields = (opening.fields ?? []).filter(
    (f) => f.type !== FORM_FIELD_TYPE.FILE,
  );
  const files = (opening.fields ?? []).filter(
    (f) => f.type === FORM_FIELD_TYPE.FILE,
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-100">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.07] px-4 sm:px-6">
        <Icon name="bolt" className="text-[20px] text-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            Screening · {opening.title}
          </p>
          <p className="text-xs text-neutral-500">
            {finished
              ? `Done: ${done.length} looked at`
              : `${index + 1} of ${lineUp.length} in Applied, oldest first`}
          </p>
        </div>
        <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-white/[0.07] sm:block">
          <div
            className="h-full rounded-full bg-amber-300 transition-[width] duration-300"
            style={{
              width: `${lineUp.length ? (Math.min(index, lineUp.length) / lineUp.length) * 100 : 100}%`,
            }}
          />
        </div>
        <IconAction
          icon="undo"
          label="Undo the last one (Z)"
          disabled={!done.length || busy}
          onClick={undo}
        />
        <IconAction icon="close" label="Close (Esc)" onClick={onClose} />
      </header>

      {finished || !current ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div>
              <p className="text-lg font-semibold text-white">
                {lineUp.length ? 'All screened' : 'Nobody waiting'}
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                {lineUp.length
                  ? `${shortlisted.length} shortlisted, ${rejected.length} rejected, ${maybes.length} maybe, ${skipped.length} skipped.`
                  : 'Everyone in this opening has been screened.'}
              </p>
            </div>
            {shortlisted.length > 0 && (
              <AdminButton
                tone="primary"
                icon="assignment"
                onClick={() =>
                  onCompose(shortlisted, QUICK_ACTION_TEMPLATES.sendTask)
                }
              >
                Send the task to {shortlisted.length} shortlisted
              </AdminButton>
            )}
            {rejected.length > 0 && (
              <AdminButton
                icon="mail"
                onClick={() =>
                  onCompose(rejected, QUICK_ACTION_TEMPLATES.rejectNotFit)
                }
              >
                Email the {rejected.length} rejected
              </AdminButton>
            )}
            <div className="flex gap-2">
              {done.length > 0 && (
                <AdminButton tone="ghost" icon="undo" onClick={undo}>
                  Undo the last one
                </AdminButton>
              )}
              <AdminButton tone="ghost" onClick={onClose}>
                Back to the board
              </AdminButton>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={scroller}
            className="custom-scrollbar flex-1 overflow-y-auto"
          >
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex min-w-0 flex-col gap-5">
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {current.name}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
                    <span>{current.email}</span>
                    <span>applied {timeAgo(current.submittedAt)}</span>
                    {current.source && current.source !== 'direct' && (
                      <span>via {sourceLabel(current.source)}</span>
                    )}
                    {(current.tags ?? []).map((t) => {
                      const meta = POOL_TAGS.find((p) => p.value === t);
                      return (
                        <Pill key={t} icon={meta?.icon}>
                          {meta?.label ?? t}
                        </Pill>
                      );
                    })}
                  </p>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((f) => (
                      <Answer key={f.id} field={f} application={current} />
                    ))}
                  </div>
                )}
                <dl className="flex flex-col gap-4">
                  {fields.map((f) => (
                    <div key={f.id} className="flex flex-col gap-1">
                      <dt className="text-xs font-medium text-neutral-500">
                        {f.label}
                      </dt>
                      <dd className="text-[15px] leading-relaxed text-neutral-100">
                        <Answer field={f} application={current} />
                      </dd>
                    </div>
                  ))}
                </dl>
                {current.notes && (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-sm text-neutral-300">
                    <p className="mb-1 text-xs font-medium text-neutral-500">
                      Notes
                    </p>
                    <p className="whitespace-pre-wrap">{current.notes}</p>
                  </div>
                )}
              </div>
              <aside className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
                {opening.screening ? (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                      <Icon name="checklist" className="text-[16px]" />
                      What we look for
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                      {opening.screening}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Add screening requirements to the opening (Edit, Details) to
                    see them here while you screen.
                  </p>
                )}
                <p className="text-[11px] leading-relaxed text-neutral-600">
                  Keys: S shortlist · T top pick · M maybe · R reject · K keep
                  on file · Space skip · Z undo · Esc close
                </p>
              </aside>
            </div>
          </div>
          <footer className="shrink-0 border-t border-white/[0.07] bg-neutral-950/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
              {DECISIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  title={d.hint}
                  disabled={busy}
                  onClick={() => decide(d.value)}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-50',
                    d.tone,
                  )}
                >
                  <Icon name={d.icon} className="text-[18px]" />
                  {d.label}
                  <kbd className="rounded border border-white/15 px-1 text-[10px] opacity-70">
                    {d.key}
                  </kbd>
                </button>
              ))}
              <div className="flex-1" />
              <button
                type="button"
                disabled={busy}
                onClick={() => decide('SKIP')}
                className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-100"
              >
                Skip
                <kbd className="rounded border border-white/15 px-1 text-[10px] opacity-70">
                  Space
                </kbd>
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
};
