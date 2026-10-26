'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import type { BotState, WorldPerson } from '@/lib/world/state';
import {
  BOT_STATE_COLOR,
  BOT_STATE_LABEL,
  GUIDANCE_WEIGHT,
} from '@/lib/world/state';
import { PortalSdk } from '@/utils/services/PortalSdk';

const WorldScene = dynamic(
  () => import('./WorldScene').then((m) => m.WorldScene),
  { ssr: false },
);

const REFRESH_MS = 30000;

const STATUS_EMOJI: Record<string, string> = {
  doing: '🟡',
  done: '✅',
  not_done: '❌',
  blocked: '🔴',
  waiting: '❓',
};

const StateDot = ({ state }: { state: BotState }) => (
  <span
    className="inline-block size-2 shrink-0 rounded-full"
    style={{ backgroundColor: BOT_STATE_COLOR[state] }}
  />
);

/** Who is behind each bot, and what both did today. */
const PersonPanel = ({
  person,
  onClose,
}: {
  person: WorldPerson;
  onClose: () => void;
}) => (
  <div className="absolute inset-x-3 bottom-3 max-h-[55%] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/95 p-4 text-white shadow-2xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:max-h-[calc(100%-2rem)] md:w-80">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {person.isMe ? 'You' : person.name}
        </p>
        {person.title && (
          <p className="truncate text-xs text-neutral-400">{person.title}</p>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="material-icons !text-lg text-neutral-400 hover:text-white"
      >
        close
      </button>
    </div>

    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-white/5 p-2.5">
        <p className="text-[11px] uppercase tracking-wider text-neutral-400">
          Person
        </p>
        <p className="text-sm">{person.ownPoints} own points</p>
        <p className="text-sm">
          {person.guidance} time{person.guidance === 1 ? '' : 's'} guided
        </p>
      </div>
      <div className="rounded-xl bg-white/5 p-2.5">
        <p className="text-[11px] uppercase tracking-wider text-neutral-400">
          Bot
        </p>
        <p className="flex items-center gap-1.5 text-sm">
          <StateDot state={person.bot.state} />
          {BOT_STATE_LABEL[person.bot.state]}
        </p>
        <p className="text-sm">{person.bot.counts.done} done</p>
      </div>
    </div>

    {person.bot.points.length > 0 ? (
      <ul className="mt-3 flex flex-col gap-1.5">
        {person.bot.points.map((p, i) => (
          <li key={i} className="flex gap-2 text-sm text-neutral-200">
            <span>{(p.status && STATUS_EMOJI[p.status]) || '•'}</span>
            <span className="min-w-0">{p.text}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-neutral-400">No bot work logged today.</p>
    )}
  </div>
);

/**
 * The world: everyone in your companies with their Claude bot beside them.
 * Bots show what they are doing from today's worklog; a bot waiting on its
 * owner calls to them, and people grow with their own work and guidance.
 */
export const WorldPage = () => {
  const [people, setPeople] = useState<WorldPerson[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await PortalSdk.getData('/api/world', null);
      setPeople(res?.data?.people ?? []);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const selected = people?.find((p) => p.id === selectedId) ?? null;
  const waiting = people?.filter((p) => p.bot.state === 'waiting') ?? [];
  const working = people?.filter((p) => p.bot.state === 'working').length ?? 0;

  return (
    <div className="fixed inset-0 bg-neutral-950 pb-[72px] md:left-24 md:pb-0">
      <div className="relative size-full">
        {people && people.length > 0 && (
          <WorldScene
            people={people}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}

        <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-col gap-2 text-white md:max-w-sm">
          <div className="pointer-events-auto rounded-2xl bg-neutral-900/80 px-4 py-3 backdrop-blur">
            <h1 className="text-base font-bold">World</h1>
            <p className="text-xs text-neutral-400">
              {people === null
                ? error
                  ? 'Could not load the world.'
                  : 'Loading…'
                : `${working} bot${working === 1 ? '' : 's'} working · ${waiting.length} waiting on their owner`}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-400">
              {(
                ['working', 'waiting', 'blocked', 'done', 'asleep'] as const
              ).map((s) => (
                <span key={s} className="flex items-center gap-1">
                  <StateDot state={s} />
                  {BOT_STATE_LABEL[s]}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-neutral-500">
              People grow with their own work, and guiding a waiting bot counts{' '}
              {GUIDANCE_WEIGHT}×.
            </p>
          </div>
          {waiting.length > 0 && (
            <div className="pointer-events-auto flex flex-col gap-1">
              {waiting.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    'truncate rounded-xl bg-sky-500/15 px-3 py-2 text-left text-xs text-sky-100 ring-1 ring-sky-400/30 hover:bg-sky-500/25',
                    p.isMe && 'ring-2 ring-sky-300',
                  )}
                >
                  ❓ {p.isMe ? 'Your bot' : `${p.name}'s bot`}:{' '}
                  {p.bot.current ?? 'needs input'}
                </button>
              ))}
            </div>
          )}
        </div>

        {people?.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-neutral-400">
            Join a company to see your team here.
          </div>
        )}

        {selected && (
          <PersonPanel person={selected} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
};
