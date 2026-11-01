'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  normalizeSource,
  SHARE_CHANNELS,
  sharePost,
  sourceLabel,
  taggedApplyUrl,
} from '@/lib/hiring/sources';
import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  CopyButton,
  EmptyState,
  Icon,
  NativeSelect,
  Panel,
  PanelHeader,
  Segmented,
  SkeletonRows,
  TextArea,
  TextInput,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  applyUrl,
  type HiringSectionProps,
  OPENING_STATUS_META,
} from './hiringMeta';

interface SourceOpening {
  id: string;
  title: string;
  slug: string;
  status: string;
  description: string | null;
  department: string | null;
  location: string | null;
  employmentType: string | null;
}

interface SourceRow {
  openingId: string;
  source: string;
  applied: number;
  shortlisted: number;
  task: number;
  interview: number;
  hired: number;
}

const pct = (n: number, of: number) =>
  of ? `${Math.round((n / of) * 100)}%` : '—';

/** A link with a copy button, in monospace. */
const LinkLine = ({ value }: { value: string }) => (
  <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-neutral-900/60 px-3 py-1.5">
    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-neutral-300">
      {value}
    </span>
    <CopyButton value={value} label="Copy link" />
  </div>
);

/** Ready-made posts and images for one opening, each with its own link. */
const ShareKit = ({
  opening,
  companyName,
}: {
  opening: SourceOpening;
  companyName: string;
}) => {
  const [channel, setChannel] =
    useState<(typeof SHARE_CHANNELS)[number]['key']>('linkedin');
  const meta = SHARE_CHANNELS.find((c) => c.key === channel)!;
  const link = taggedApplyUrl(applyUrl(opening.slug), channel);
  const [text, setText] = useState('');
  const [customTag, setCustomTag] = useState('');
  const custom = normalizeSource(customTag);

  useEffect(() => {
    setText(sharePost(channel, opening, companyName, link));
  }, [channel, opening, companyName, link]);

  const format = channel === 'linkedin' ? 'wide' : 'square';
  const image = `/api/hiring/openings/${opening.id}/share-image?format=${format}`;

  if (opening.status !== 'OPEN')
    return (
      <p className="flex items-center gap-2 px-5 py-4 text-sm text-neutral-500">
        <Icon name="info" className="text-[18px]" />
        Publish the opening to share it. It’s{' '}
        {OPENING_STATUS_META[opening.status]?.label.toLowerCase()} now.
      </p>
    );

  return (
    <div className="flex flex-col gap-4 p-5">
      <Segmented
        value={channel}
        onChange={setChannel}
        className="self-start"
        options={SHARE_CHANNELS.map((c) => ({
          value: c.key,
          label: c.label,
          icon: c.icon,
        }))}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Post
          </p>
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
          />
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton value={text} label="Copy post" />
            <span className="text-xs text-neutral-500">Copy post</span>
            {meta.shareUrl && (
              <AdminButton
                size="sm"
                icon="share"
                className="ml-auto"
                onClick={() =>
                  window.open(meta.shareUrl!(link, text), '_blank', 'noopener')
                }
              >
                Open {meta.label}
              </AdminButton>
            )}
          </div>
          {meta.linkNote && (
            <p className="text-[11px] text-amber-200/80">{meta.linkNote}</p>
          )}
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
            {meta.label} link
          </p>
          <LinkLine value={link} />
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Another source
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <TextInput
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="e.g. college-group, referral-priya"
              className="h-9 text-xs sm:w-60"
            />
            {custom && (
              <div className="min-w-0 flex-1">
                <LinkLine
                  value={taggedApplyUrl(applyUrl(opening.slug), custom)}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Image
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={image}
            src={image}
            alt={`We're hiring: ${opening.title}`}
            className={cn(
              'w-full rounded-xl border border-white/[0.07] bg-neutral-900',
              format === 'wide' ? 'aspect-[1200/627]' : 'aspect-square',
            )}
          />
          <a
            href={image}
            download={`${opening.slug}-${format}.png`}
            className="inline-flex items-center gap-1.5 self-start text-xs text-sky-300 hover:underline"
          >
            <Icon name="download" className="text-[16px]" />
            Download {format === 'wide' ? '1200×627' : '1080×1080'} PNG
          </a>
        </div>
      </div>
    </div>
  );
};

/**
 * Which channels bring people who get shortlisted, not just people who
 * apply, from the apply link's ?ref= tag; and a share kit per opening.
 */
export const HiringSources = ({
  companyId,
  companyName,
}: HiringSectionProps) => {
  const [openings, setOpenings] = useState<SourceOpening[]>([]);
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/hiring/sources?companyId=${companyId}`,
        null,
      );
      const list: SourceOpening[] = res?.data?.openings ?? [];
      setOpenings(list);
      setRows(res?.data?.rows ?? []);
      setOpeningId(
        (current) =>
          current ||
          list.find((o) => o.status === 'OPEN')?.id ||
          list[0]?.id ||
          '',
      );
    } catch (err) {
      toast.error(errorText(err, 'Could not load sources.'));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const opening = openings.find((o) => o.id === openingId) ?? null;
  // Every opening together, or one.
  const [scope, setScope] = useState<'all' | 'one'>('all');
  const table = useMemo(() => {
    const picked =
      scope === 'one' ? rows.filter((r) => r.openingId === openingId) : rows;
    const bySource = new Map<string, SourceRow>();
    for (const r of picked) {
      const row = bySource.get(r.source) ?? {
        ...r,
        applied: 0,
        shortlisted: 0,
        task: 0,
        interview: 0,
        hired: 0,
      };
      row.applied += r.applied;
      row.shortlisted += r.shortlisted;
      row.task += r.task;
      row.interview += r.interview;
      row.hired += r.hired;
      bySource.set(r.source, row);
    }
    return Array.from(bySource.values()).sort(
      (a, b) => b.shortlisted - a.shortlisted || b.applied - a.applied,
    );
  }, [rows, scope, openingId]);
  const best = Math.max(0, ...table.map((r) => r.applied));

  if (loading && !openings.length)
    return (
      <Panel>
        <SkeletonRows rows={4} />
      </Panel>
    );
  if (!openings.length)
    return (
      <Panel>
        <EmptyState
          icon="campaign"
          title="No openings yet"
          description="Create and publish an opening to get share links for it."
        />
      </Panel>
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <NativeSelect
          aria-label="Opening"
          value={openingId}
          onChange={(e) => setOpeningId(e.target.value)}
          className="h-9 w-64 text-sm"
        >
          {openings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </NativeSelect>
      </div>

      <Panel className="overflow-hidden">
        <PanelHeader
          icon="campaign"
          title="Share kit"
          description={
            opening
              ? `Ready-made posts and images for ${opening.title}. Each link carries its channel, so you can see below where people came from.`
              : undefined
          }
        />
        {opening && <ShareKit opening={opening} companyName={companyName} />}
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader
          icon="insights"
          title="Where applicants come from"
          description="Rejected people count for the stages they reached first. People who applied through a plain link show as Direct."
          actions={
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: 'Every opening' },
                { value: 'one', label: 'This opening' },
              ]}
            />
          }
        />
        {table.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-neutral-500">
            No applicants yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-neutral-500">
                <tr className="border-b border-white/[0.07]">
                  <th className="px-5 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Applied</th>
                  <th className="px-3 py-2 font-medium">Shortlisted</th>
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Interview</th>
                  <th className="px-3 py-2 font-medium">Hired</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr
                    key={r.source}
                    className="border-b border-white/[0.05] last:border-b-0"
                  >
                    <td className="px-5 py-2.5 text-neutral-100">
                      {sourceLabel(r.source)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="w-8 tabular-nums text-neutral-200">
                          {r.applied}
                        </span>
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                          <span
                            className="block h-full rounded-full bg-sky-400/70"
                            style={{
                              width: `${(r.applied / (best || 1)) * 100}%`,
                            }}
                          />
                        </span>
                      </span>
                    </td>
                    {(
                      ['shortlisted', 'task', 'interview', 'hired'] as const
                    ).map((k) => (
                      <td key={k} className="px-3 py-2.5 tabular-nums">
                        <span className="text-neutral-200">{r[k]}</span>{' '}
                        <span className="text-xs text-neutral-500">
                          {pct(r[k], r.applied)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};
