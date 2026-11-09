'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { PdfPages, type PdfSource } from '@/components/global/PdfPages';
import { cn } from '@/lib/utils';
import type { PlacementKind } from '@/models/agreements';

import { Icon } from '../shared/AdminUI';

/*
 * Where each person signs on an uploaded PDF: pick whose box it is and what
 * goes in it (their signature, initials or the day they sign), then click
 * the spot on the page. Boxes can be dragged, resized and removed. Every
 * person needs at least one signature box before it can go out.
 */

export type BoxDraft = {
  id: string;
  kind: PlacementKind;
  /** 0 is whoever signs for the company; 1, 2… the other signers in order. */
  signer: number;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type BoxRecipient = { n: number; name: string; note?: string };

/** One colour per person, the same everywhere they show. */
export const RECIPIENT_COLORS = [
  '#7c3aed', // the company
  '#2563eb',
  '#d97706',
  '#059669',
  '#db2777',
  '#0891b2',
  '#ea580c',
  '#4f46e5',
  '#65a30d',
  '#be123c',
  '#0f766e',
];

export const recipientColor = (n: number) =>
  RECIPIENT_COLORS[n % RECIPIENT_COLORS.length];

export const KIND_META: Record<
  PlacementKind,
  { label: string; icon: string; w: number; h: number }
> = {
  signature: { label: 'Signature', icon: 'signature', w: 170, h: 44 },
  initials: { label: 'Initials', icon: 'text_fields', w: 56, h: 34 },
  date: { label: 'Date signed', icon: 'event', w: 104, h: 22 },
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

let seq = 0;
const boxId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`;

const Box = ({
  box,
  name,
  selected,
  onSelect,
  onChange,
  onRemove,
}: {
  box: BoxDraft;
  name: string;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<BoxDraft>) => void;
  onRemove: () => void;
}) => {
  const drag = useRef<{
    mode: 'move' | 'size';
    x: number;
    y: number;
    start: BoxDraft;
    rect: DOMRect;
  } | null>(null);
  const color = recipientColor(box.signer);
  const meta = KIND_META[box.kind];

  const begin = (mode: 'move' | 'size') => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const layer = (e.currentTarget as HTMLElement).closest(
      '[data-layer]',
    ) as HTMLElement | null;
    if (!layer) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      mode,
      x: e.clientX,
      y: e.clientY,
      start: box,
      rect: layer.getBoundingClientRect(),
    };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / d.rect.width;
    const dy = (e.clientY - d.y) / d.rect.height;
    if (d.mode === 'move')
      onChange({
        x: clamp(d.start.x + dx, 0, 1 - d.start.w),
        y: clamp(d.start.y + dy, 0, 1 - d.start.h),
      });
    else
      onChange({
        w: clamp(d.start.w + dx, 0.02, 1 - d.start.x),
        h: clamp(d.start.h + dy, 0.01, 1 - d.start.y),
      });
  };
  const end = () => {
    drag.current = null;
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${meta.label} for ${name}`}
      onPointerDown={begin('move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={(e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onRemove();
        }
      }}
      className={cn(
        'group absolute flex cursor-move touch-none select-none items-center gap-1 overflow-visible rounded-[3px] border-[1.5px] px-1 outline-none',
        selected && 'ring-2 ring-offset-1',
      )}
      style={{
        left: `${box.x * 100}%`,
        top: `${box.y * 100}%`,
        width: `${box.w * 100}%`,
        height: `${box.h * 100}%`,
        borderColor: color,
        background: `${color}1f`,
        color,
        ['--tw-ring-color' as string]: `${color}66`,
      }}
    >
      <Icon name={meta.icon} className="shrink-0 text-[13px]" />
      <span className="min-w-0 truncate text-[10px] font-semibold leading-tight">
        {box.kind === 'signature' ? `${name}` : meta.label}
      </span>
      <button
        type="button"
        aria-label="Remove"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          'absolute -right-2.5 -top-2.5 flex size-5 items-center justify-center rounded-full bg-white text-[13px] shadow ring-1 ring-black/10 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        style={{ color }}
      >
        <Icon name="close" />
      </button>
      <span
        aria-hidden
        onPointerDown={begin('size')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="absolute -bottom-1.5 -right-1.5 size-3 cursor-nwse-resize rounded-sm border-2 bg-white"
        style={{ borderColor: color }}
      />
    </div>
  );
};

export const PlaceBoxes = ({
  source,
  pages,
  recipients,
  boxes,
  onChange,
}: {
  source: PdfSource;
  pages: Array<{ w: number; h: number }>;
  recipients: BoxRecipient[];
  boxes: BoxDraft[];
  onChange: (boxes: BoxDraft[]) => void;
}) => {
  const [who, setWho] = useState<number>(recipients[0]?.n ?? 1);
  const [tool, setTool] = useState<PlacementKind | null>('signature');
  const [selected, setSelected] = useState<string | null>(null);

  // Someone removed: their boxes go, and the picker moves on.
  useEffect(() => {
    if (!recipients.some((r) => r.n === who) && recipients[0])
      setWho(recipients[0].n);
  }, [recipients, who]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTool(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nameOf = useCallback(
    (n: number) => recipients.find((r) => r.n === n)?.name ?? 'Signer',
    [recipients],
  );

  const place = (page: number, at: { x: number; y: number }) => {
    if (!tool) {
      setSelected(null);
      return;
    }
    const size = pages[page];
    const meta = KIND_META[tool];
    const w = Math.min(0.9, meta.w / size.w);
    const h = Math.min(0.5, meta.h / size.h);
    const box: BoxDraft = {
      id: boxId(),
      kind: tool,
      signer: who,
      page,
      x: clamp(at.x - w / 2, 0, 1 - w),
      y: clamp(at.y - h / 2, 0, 1 - h),
      w,
      h,
    };
    onChange([...boxes, box]);
    setSelected(box.id);
  };

  /** A date box under each of this person's signatures that has none. */
  const addDates = () => {
    const added: BoxDraft[] = [];
    for (const s of boxes.filter(
      (b) => b.kind === 'signature' && b.signer === who,
    )) {
      const size = pages[s.page];
      const h = KIND_META.date.h / size.h;
      const w = KIND_META.date.w / size.w;
      const below = { x: s.x, y: s.y + s.h + 4 / size.h };
      const exists = boxes.some(
        (b) =>
          b.kind === 'date' &&
          b.signer === who &&
          b.page === s.page &&
          Math.abs(b.y - below.y) < 0.03,
      );
      if (exists) continue;
      added.push({
        id: boxId(),
        kind: 'date',
        signer: who,
        page: s.page,
        x: clamp(below.x, 0, 1 - w),
        y: clamp(below.y, 0, 1 - h),
        w,
        h,
      });
    }
    if (added.length) onChange([...boxes, ...added]);
  };

  /** Initials at the foot of every page for this person. */
  const initialEveryPage = () => {
    const added: BoxDraft[] = [];
    pages.forEach((size, page) => {
      if (
        boxes.some(
          (b) => b.kind === 'initials' && b.signer === who && b.page === page,
        )
      )
        return;
      const w = KIND_META.initials.w / size.w;
      const h = KIND_META.initials.h / size.h;
      const slot = recipients.findIndex((r) => r.n === who);
      added.push({
        id: boxId(),
        kind: 'initials',
        signer: who,
        page,
        x: clamp(1 - 0.06 - w - slot * (w + 0.01), 0, 1 - w),
        y: clamp(1 - 0.035 - h, 0, 1 - h),
        w,
        h,
      });
    });
    if (added.length) onChange([...boxes, ...added]);
  };

  const missing = recipients.filter(
    (r) => !boxes.some((b) => b.signer === r.n && b.kind === 'signature'),
  );
  const mine = boxes.filter((b) => b.signer === who);

  return (
    <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
      <div className="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Boxes for
          </p>
          {recipients.map((r) => {
            const count = boxes.filter((b) => b.signer === r.n).length;
            const ok = !missing.includes(r);
            return (
              <button
                key={r.n}
                type="button"
                onClick={() => setWho(r.n)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                  who === r.n
                    ? 'border-white/25 bg-white/[0.07]'
                    : 'border-white/[0.07] hover:border-white/15 hover:bg-white/[0.03]',
                )}
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: recipientColor(r.n) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    {r.name}
                  </span>
                  <span className="block truncate text-[11px] text-neutral-500">
                    {r.note ? `${r.note} · ` : ''}
                    {count
                      ? `${count} ${count === 1 ? 'box' : 'boxes'}`
                      : 'No boxes yet'}
                  </span>
                </span>
                <Icon
                  name={ok ? 'check_circle' : 'error'}
                  className={cn(
                    'text-[16px]',
                    ok ? 'text-emerald-400' : 'text-amber-400',
                  )}
                />
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Add
          </p>
          {(Object.keys(KIND_META) as PlacementKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTool((t) => (t === k ? null : k))}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors',
                tool === k
                  ? 'text-white'
                  : 'border-white/[0.07] text-neutral-300 hover:border-white/15 hover:bg-white/[0.03]',
              )}
              style={
                tool === k
                  ? {
                      borderColor: recipientColor(who),
                      background: `${recipientColor(who)}26`,
                    }
                  : undefined
              }
            >
              <Icon name={KIND_META[k].icon} className="text-[17px]" />
              {KIND_META[k].label}
            </button>
          ))}
          <p className="text-[11px] leading-relaxed text-neutral-500">
            {tool
              ? `Click on the page where ${nameOf(who)}’s ${KIND_META[tool].label.toLowerCase()} goes. Drag to move, pull the corner to resize.`
              : 'Pick what to add, then click on the page.'}
          </p>
          <div className="mt-1 flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={addDates}
              disabled={!mine.some((b) => b.kind === 'signature')}
              className="flex items-center gap-1.5 text-left text-xs text-neutral-400 hover:text-white disabled:opacity-40"
            >
              <Icon name="event" className="text-[15px]" />
              Date under each of their signatures
            </button>
            <button
              type="button"
              onClick={initialEveryPage}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white"
            >
              <Icon name="text_fields" className="text-[15px]" />
              Their initials on every page
            </button>
            {mine.length > 0 && (
              <button
                type="button"
                onClick={() => onChange(boxes.filter((b) => b.signer !== who))}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-300"
              >
                <Icon name="delete" className="text-[15px]" />
                Clear their boxes
              </button>
            )}
          </div>
        </div>

        {missing.length > 0 ? (
          <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-2 text-xs text-amber-200">
            <Icon name="info" className="mt-px text-[15px]" />
            Still needs a signature box: {missing.map((m) => m.name).join(', ')}
            .
          </p>
        ) : (
          <p className="flex items-start gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-2 text-xs text-emerald-200">
            <Icon name="check_circle" className="mt-px text-[15px]" />
            Everyone has a place to sign.
          </p>
        )}
      </div>

      <div
        className={cn(
          'rounded-xl bg-neutral-800/50 p-3 sm:p-5',
          tool && '[&_[data-layer]]:cursor-crosshair',
        )}
      >
        <PdfPages
          source={source}
          pages={pages}
          onPageClick={place}
          overlay={(page) => (
            <div data-layer className="absolute inset-0">
              {boxes
                .filter((b) => b.page === page)
                .map((b) => (
                  <Box
                    key={b.id}
                    box={b}
                    name={nameOf(b.signer)}
                    selected={selected === b.id}
                    onSelect={() => setSelected(b.id)}
                    onChange={(patch) =>
                      onChange(
                        boxes.map((x) =>
                          x.id === b.id ? { ...x, ...patch } : x,
                        ),
                      )
                    }
                    onRemove={() => {
                      onChange(boxes.filter((x) => x.id !== b.id));
                      setSelected(null);
                    }}
                  />
                ))}
            </div>
          )}
        />
      </div>
    </div>
  );
};

export type BoxView = BoxDraft & {
  name: string;
  /** What they signed with, once they have. */
  signed: {
    name: string;
    image: string | null;
    initials: string;
    at: string;
  } | null;
};

const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

/** The boxes on an uploaded PDF as they stand: who signs where, and what they signed. */
export const BoxesPreview = ({
  source,
  pages,
  boxes,
}: {
  source: PdfSource;
  pages: Array<{ w: number; h: number }>;
  boxes: BoxView[];
}) => (
  <div className="rounded-xl bg-neutral-800/50 p-3 sm:p-5">
    <PdfPages
      source={source}
      pages={pages}
      overlay={(page) =>
        boxes
          .filter((b) => b.page === page)
          .map((b) => {
            const color = recipientColor(b.signer);
            const s = b.signed;
            return (
              <div
                key={b.id}
                title={`${KIND_META[b.kind].label} · ${b.name}${s ? ` · signed ${shortDay(s.at)}` : ' · not signed yet'}`}
                className="absolute flex items-center overflow-hidden rounded-[3px] px-1"
                style={{
                  left: `${b.x * 100}%`,
                  top: `${b.y * 100}%`,
                  width: `${b.w * 100}%`,
                  height: `${b.h * 100}%`,
                  border: s ? `1px solid ${color}55` : `1.5px dashed ${color}`,
                  background: s ? 'transparent' : `${color}14`,
                  color: s ? '#1e3a8a' : color,
                }}
              >
                {!s ? (
                  <span className="flex min-w-0 items-center gap-1 text-[10px] font-semibold">
                    <Icon
                      name={KIND_META[b.kind].icon}
                      className="text-[12px]"
                    />
                    <span className="truncate">
                      {b.kind === 'signature'
                        ? b.name
                        : KIND_META[b.kind].label}
                    </span>
                  </span>
                ) : b.kind === 'signature' ? (
                  s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.image}
                      alt={`Signature of ${s.name}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="truncate font-['Caveat',cursive] text-[clamp(12px,2.2vw,22px)] leading-none">
                      {s.name}
                    </span>
                  )
                ) : b.kind === 'initials' ? (
                  <span className="mx-auto font-['Caveat',cursive] text-[clamp(11px,1.8vw,18px)] leading-none">
                    {s.initials}
                  </span>
                ) : (
                  <span className="truncate text-[clamp(8px,1.1vw,11px)]">
                    {shortDay(s.at)}
                  </span>
                )}
              </div>
            );
          })
      }
    />
  </div>
);
