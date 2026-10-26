'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import type {
  BotState,
  LeaderRow,
  World,
  WorldBot,
  WorldBrand,
} from '@/lib/world/state';
import {
  BOT_STATE_COLOR,
  BOT_STATE_LABEL,
  GUIDANCE_WEIGHT,
  STATUS_EMOJI,
} from '@/lib/world/state';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { Pick } from './WorldScene';

const WorldScene = dynamic(
  () => import('./WorldScene').then((m) => m.WorldScene),
  { ssr: false },
);

const REFRESH_MS = 30000;

const accentOf = (item?: {
  brand?: WorldBrand;
  color: string | null;
}): string => item?.brand?.primary ?? item?.color ?? '#4f46e5';

/** A logo or avatar, or initials on the brand colour when there is none. */
const Badge = ({
  src,
  name,
  color,
  size = 20,
  round = true,
}: {
  src?: string | null;
  name: string;
  color: string;
  size?: number;
  round?: boolean;
}) => {
  const [failed, setFailed] = useState(false);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => Array.from(w)[0])
      .join('')
      .toUpperCase() || '?';
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden font-bold text-white',
        round ? 'rounded-full' : 'rounded-lg',
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        backgroundColor: color,
      }}
    >
      {initials}
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className={cn(
            'absolute inset-0 size-full bg-white',
            round ? 'object-cover' : 'object-contain p-[10%]',
          )}
        />
      )}
    </span>
  );
};

const Dot = ({ state }: { state: BotState }) => (
  <span
    className="inline-block size-2 shrink-0 rounded-full"
    style={{ backgroundColor: BOT_STATE_COLOR[state] }}
  />
);

const Card = ({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) => (
  <div
    className={cn('rounded-2xl bg-white/90 shadow-lg backdrop-blur', className)}
    style={style}
  >
    {children}
  </div>
);

const Progress = ({ bot }: { bot: WorldBot }) => {
  const pct = bot.progress.total
    ? (bot.progress.done / bot.progress.total) * 100
    : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          backgroundColor: BOT_STATE_COLOR[bot.state],
        }}
      />
    </div>
  );
};

const Leaderboard = ({
  rows,
  color,
  unit = 'pts',
}: {
  rows: LeaderRow[];
  color: string;
  unit?: string;
}) =>
  rows.length ? (
    <ol className="flex flex-col gap-1">
      {rows.map((r, i) => (
        <li key={r.id} className="flex items-center gap-2 text-sm">
          <span className="w-5 text-center">
            {['🥇', '🥈', '🥉'][i] ?? i + 1}
          </span>
          <Badge src={r.avatar} name={r.name} color={color} size={20} />
          <span className="min-w-0 flex-1 truncate">{r.name}</span>
          <span className="text-xs text-neutral-500">
            {Math.round(r.points)} {unit}
          </span>
        </li>
      ))}
    </ol>
  ) : (
    <p className="text-sm text-neutral-500">No points yet this week.</p>
  );

const BotRow = ({ bot, onOpen }: { bot: WorldBot; onOpen: () => void }) => (
  <button
    onClick={onOpen}
    className="flex w-full flex-col gap-1 rounded-xl bg-neutral-50 p-2 text-left hover:bg-neutral-100"
  >
    <span className="flex items-center gap-1.5 text-sm">
      <Dot state={bot.state} />
      <span className="font-medium">{bot.ownerName}</span>
      <span className="ml-auto text-xs text-neutral-500">
        {bot.progress.done}/{bot.progress.total}
      </span>
    </span>
    {bot.current && (
      <span className="truncate text-xs text-neutral-600">{bot.current}</span>
    )}
    <Progress bot={bot} />
  </button>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="mt-4">
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
      {title}
    </p>
    {children}
  </div>
);

/**
 * The World: companies are towns, projects are buildings, and every person's
 * Claude works as bots at the buildings. Finished bots and bots that need
 * permission fly back to their owner.
 */
export const WorldPage = () => {
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Pick | null>(null);
  const [focus, setFocus] = useState<Pick | 'all' | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await PortalSdk.getData('/api/world', null);
      setWorld(res?.data ?? null);
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

  const go = (pick: Pick | null) => {
    setSelected(pick);
    if (pick) setFocus({ ...pick });
  };

  const me = world?.people.find((p) => p.isMe);
  const waitingOnMe = useMemo(
    () =>
      world?.bots.filter(
        (b) => b.ownerId === me?.id && b.state === 'waiting',
      ) ?? [],
    [world, me],
  );
  const working = world?.bots.filter((b) => b.state === 'working').length ?? 0;

  const town =
    selected?.type === 'town'
      ? world?.towns.find((t) => t.id === selected.id)
      : null;
  const building =
    selected?.type === 'building'
      ? world?.buildings.find((b) => b.id === selected.id)
      : null;
  const bot =
    selected?.type === 'bot'
      ? world?.bots.find((b) => b.id === selected.id)
      : null;
  const person =
    selected?.type === 'person'
      ? world?.people.find((p) => p.id === selected.id)
      : null;
  const townOf = (id?: string) => world?.towns.find((t) => t.id === id);
  const buildingOf = (id?: string | null) =>
    world?.buildings.find((b) => b.id === id);

  // Breadcrumb: World › Town › Building.
  const crumbTown =
    town ??
    townOf(
      building?.townId ??
        bot?.townId ??
        (person ? person.townIds[0] : undefined),
    );
  const crumbBuilding = building ?? (bot ? buildingOf(bot.projectId) : null);
  // The card wears the town's colours.
  const cardColor = accentOf(crumbTown);
  const cardBadge = town
    ? { src: town.brand?.logo ?? town.logo, name: town.name, round: false }
    : building
      ? {
          src: building.brand?.logo ?? building.logo,
          name: building.name,
          round: false,
        }
      : bot
        ? { src: bot.ownerAvatar, name: bot.ownerName, round: true }
        : person
          ? { src: person.avatar, name: person.name, round: true }
          : null;

  return (
    <div className="fixed inset-0 bg-[#eef1f5] pb-[72px] md:left-24 md:pb-0">
      <div className="relative size-full">
        {world && world.towns.length > 0 && (
          <WorldScene
            world={world}
            selected={selected}
            focus={focus}
            onPick={go}
          />
        )}

        {/* Top: where you are and where you can go. */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2 md:inset-x-4 md:top-4">
          <Card className="pointer-events-auto flex flex-wrap items-center gap-1 self-start px-3 py-2 text-sm">
            <button
              onClick={() => {
                setSelected(null);
                setFocus('all');
              }}
              className="font-bold text-neutral-900 hover:underline"
            >
              🌍 World
            </button>
            {crumbTown && (
              <>
                <span className="text-neutral-400">›</span>
                <button
                  onClick={() => go({ type: 'town', id: crumbTown.id })}
                  className="font-medium text-neutral-800 hover:underline"
                >
                  {crumbTown.name}
                </button>
              </>
            )}
            {crumbBuilding && (
              <>
                <span className="text-neutral-400">›</span>
                <button
                  onClick={() => go({ type: 'building', id: crumbBuilding.id })}
                  className="font-medium text-neutral-800 hover:underline"
                >
                  {crumbBuilding.name}
                </button>
              </>
            )}
            <span className="ml-2 text-xs text-neutral-500">
              {world
                ? `${working} working · ${world.bots.filter((b) => b.state === 'waiting').length} waiting`
                : error
                  ? 'Could not load the world.'
                  : 'Loading…'}
            </span>
          </Card>

          {world && world.towns.length > 1 && (
            <div className="pointer-events-auto flex gap-1.5 overflow-x-auto pb-1">
              {world.towns.map((t) => (
                <button
                  key={t.id}
                  onClick={() => go({ type: 'town', id: t.id })}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full bg-white/90 py-0.5 pl-0.5 pr-3 text-xs font-medium text-neutral-800 shadow hover:bg-white',
                    crumbTown?.id === t.id && 'ring-2',
                  )}
                  style={{ ['--tw-ring-color' as any]: accentOf(t) }}
                >
                  <Badge
                    src={t.brand?.logo ?? t.logo}
                    name={t.name}
                    color={accentOf(t)}
                  />
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {waitingOnMe.length > 0 && (
            <div className="pointer-events-auto flex max-w-sm flex-col gap-1">
              {waitingOnMe.slice(0, 3).map((b) => (
                <button
                  key={b.id}
                  onClick={() => go({ type: 'bot', id: b.id })}
                  className="truncate rounded-xl bg-sky-500 px-3 py-2 text-left text-xs font-medium text-white shadow-lg hover:bg-sky-600"
                >
                  ❓ Your bot
                  {buildingOf(b.projectId)
                    ? ` at ${buildingOf(b.projectId)!.name}`
                    : ''}{' '}
                  is waiting: {b.current ?? 'needs you'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Legend, bottom left on wide screens. */}
        <Card className="absolute bottom-4 left-4 hidden px-3 py-2 text-[11px] text-neutral-600 md:block">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {(['working', 'waiting', 'blocked', 'done'] as const).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <Dot state={s} />
                {BOT_STATE_LABEL[s]}
              </span>
            ))}
          </div>
          <p className="mt-1 text-neutral-500">
            Drag to move · right-drag to turn · scroll to zoom · click anything
          </p>
        </Card>

        {world?.towns.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-neutral-600">
            Join a company to see its town here.
          </div>
        )}

        {/* The selected thing. */}
        {(town || building || bot || person) && (
          <Card
            className="absolute inset-x-3 bottom-3 max-h-[55%] overflow-y-auto border-t-4 p-4 md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:max-h-[calc(100%-2rem)] md:w-80"
            style={{ borderColor: cardColor }}
          >
            <div className="-mt-1 flex items-start justify-between gap-2">
              {cardBadge && (
                <Badge
                  src={cardBadge.src}
                  name={cardBadge.name}
                  color={cardColor}
                  size={40}
                  round={cardBadge.round}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-neutral-900">
                  {town?.name ??
                    building?.name ??
                    (bot
                      ? `${bot.ownerName}'s bot`
                      : person?.isMe
                        ? 'You'
                        : person?.name)}
                </p>
                <p className="text-xs text-neutral-500">
                  {town &&
                    `Town · ${Math.round(town.weekPoints)} points this week`}
                  {building &&
                    `#${building.rank} in ${townOf(building.townId)?.name} · by ${building.rankedBy.toLowerCase()}`}
                  {bot &&
                    `${BOT_STATE_LABEL[bot.state]}${buildingOf(bot.projectId) ? ` · ${buildingOf(bot.projectId)!.name}` : ''}`}
                  {person && (person.title ?? 'Person')}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="material-icons !text-lg text-neutral-400 hover:text-neutral-800"
              >
                close
              </button>
            </div>

            {town && (
              <>
                <Section title="Leaderboard this week">
                  <Leaderboard rows={town.leaderboard} color={cardColor} />
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Guiding a waiting bot counts {GUIDANCE_WEIGHT}×.
                  </p>
                </Section>
                <Section title="Buildings">
                  <ol className="flex flex-col gap-1">
                    {world!.buildings
                      .filter((b) => b.townId === town.id)
                      .map((b) => (
                        <li key={b.id}>
                          <button
                            onClick={() => go({ type: 'building', id: b.id })}
                            className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left text-sm hover:bg-neutral-100"
                          >
                            <span className="w-6 text-xs text-neutral-500">
                              #{b.rank}
                            </span>
                            <Badge
                              src={b.brand?.logo ?? b.logo}
                              name={b.name}
                              color={accentOf(b)}
                              round={false}
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {b.name}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {
                                world!.bots.filter(
                                  (x) =>
                                    x.projectId === b.id &&
                                    x.state === 'working',
                                ).length
                              }{' '}
                              🤖
                            </span>
                          </button>
                        </li>
                      ))}
                  </ol>
                </Section>
              </>
            )}

            {building && (
              <>
                <Section title="Leaderboard this week">
                  <Leaderboard rows={building.leaderboard} color={cardColor} />
                </Section>
                <Section title="Bots here today">
                  <div className="flex flex-col gap-1.5">
                    {world!.bots
                      .filter((b) => b.projectId === building.id)
                      .map((b) => (
                        <BotRow
                          key={b.id}
                          bot={b}
                          onOpen={() => go({ type: 'bot', id: b.id })}
                        />
                      ))}
                    {!world!.bots.some((b) => b.projectId === building.id) && (
                      <p className="text-sm text-neutral-500">
                        No bots here today.
                      </p>
                    )}
                  </div>
                </Section>
              </>
            )}

            {bot && (
              <>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-neutral-500">
                    <span>Progress</span>
                    <span>
                      {bot.progress.done} of {bot.progress.total} steps
                    </span>
                  </div>
                  <Progress bot={bot} />
                </div>
                <Section title="Steps">
                  <ul className="flex flex-col gap-1">
                    {bot.points.map((p, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm text-neutral-700"
                      >
                        <span>
                          {(p.status && STATUS_EMOJI[p.status]) || '•'}
                        </span>
                        <span className="min-w-0">{p.text}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
                <button
                  onClick={() => go({ type: 'person', id: bot.ownerId })}
                  className="mt-3 text-xs font-medium text-neutral-900 hover:underline"
                >
                  See {bot.ownerId === me?.id ? 'yourself' : bot.ownerName} →
                </button>
              </>
            )}

            {person && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-neutral-50 p-2">
                    <p className="text-lg font-bold">{person.ownPoints}</p>
                    <p className="text-xs text-neutral-500">own points today</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-2">
                    <p className="text-lg font-bold">{person.guidance}</p>
                    <p className="text-xs text-neutral-500">
                      times guided a bot ({GUIDANCE_WEIGHT}×)
                    </p>
                  </div>
                </div>
                <Section title="Bots today">
                  <div className="flex flex-col gap-1.5">
                    {world!.bots
                      .filter((b) => b.ownerId === person.id)
                      .map((b) => (
                        <BotRow
                          key={b.id}
                          bot={b}
                          onOpen={() => go({ type: 'bot', id: b.id })}
                        />
                      ))}
                    {!world!.bots.some((b) => b.ownerId === person.id) && (
                      <p className="text-sm text-neutral-500">No bots today.</p>
                    )}
                  </div>
                </Section>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
