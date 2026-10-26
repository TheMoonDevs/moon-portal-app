'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import type {
  BotState,
  LeaderRow,
  World,
  WorldBot,
  WorldBrand,
  WorldProject,
  WorldSite,
} from '@/lib/world/state';
import {
  BOT_STATE_COLOR,
  BOT_STATE_LABEL,
  GUIDANCE_WEIGHT,
  LEVEL_STEP,
  siteLevel,
  STATUS_EMOJI,
} from '@/lib/world/state';
import { APP_ROUTES } from '@/utils/constants/appInfo';
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

const BotList = ({
  bots,
  onOpen,
}: {
  bots: WorldBot[];
  onOpen: (id: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    {bots.map((b) => (
      <BotRow key={b.id} bot={b} onOpen={() => onOpen(b.id)} />
    ))}
    {!bots.length && <p className="text-sm text-neutral-500">No bots today.</p>}
  </div>
);

const LevelTag = ({ done, color }: { done: number; color: string }) => {
  const { tier, level } = siteLevel(done);
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs">
      <span
        className="rounded-full px-1.5 font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {tier ? `Lv ${level}` : 'Building'}
      </span>
      {tier > 0 && (
        <span className="text-amber-500">{'★'.repeat(Math.min(tier, 4))}</span>
      )}
    </span>
  );
};

/** A project's task buildings, busiest first. */
const SiteList = ({
  project,
  color,
  onOpen,
}: {
  project: WorldProject;
  color: string;
  onOpen: (id: string) => void;
}) =>
  project.sites.length ? (
    <ul className="flex flex-col gap-0.5">
      {project.sites.map((x) => (
        <li key={x.id}>
          <button
            onClick={() => onOpen(x.id)}
            className="flex w-full items-center gap-2 rounded-lg p-1 text-left text-sm hover:bg-neutral-100"
          >
            <span className="min-w-0 flex-1 truncate">{x.name}</span>
            <span className="text-xs text-neutral-400">{x.done}×</span>
            <LevelTag done={x.done} color={color} />
          </button>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-neutral-500">
      No tasks yet. Each kind of task becomes a building here.
    </p>
  );

/** A task building: its level, and how far to the next. */
const SiteCard = ({ site, color }: { site: WorldSite; color: string }) => {
  const { tier, level, nextAt } = siteLevel(site.done);
  const unit = tier ? LEVEL_STEP ** (tier - 1) : 1;
  const from = tier ? level * unit : 0;
  const pct = ((site.done - from) / Math.max(nextAt - from, 1)) * 100;
  const upgrade = tier && level === LEVEL_STEP - 1;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <LevelTag done={site.done} color={color} />
        <span className="text-xs text-neutral-500">
          Done {site.done}× · {site.open} open
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 text-[11px] text-neutral-500">
        {nextAt - site.done} more to{' '}
        {upgrade
          ? `upgrade to ${'★'.repeat(tier + 1)}`
          : `level ${tier ? level + 1 : 1}`}
        {tier > 1 && ` · each level is ${unit} now`}
      </p>
      <p className="mt-2 text-[11px] text-neutral-400">
        The same task done again is the same building: every time adds to its
        height. The blue line is the way there from you.
      </p>
    </div>
  );
};

/** Find any town, project, task building or person and fly there. */
const GoTo = ({
  world,
  onPick,
}: {
  world: World;
  onPick: (pick: Pick) => void;
}) => {
  const [q, setQ] = useState('');
  const town = (id: string) => world.towns.find((t) => t.id === id);
  const entries: { pick: Pick; title: string; hint: string; icon: string }[] = [
    ...world.towns.map((t) => ({
      pick: { type: 'town' as const, id: t.id },
      title: t.name,
      hint: 'Town',
      icon: 'location_city',
    })),
    ...world.projects.map((p) => ({
      pick: { type: 'project' as const, id: p.id },
      title: p.name,
      hint: `Project · ${town(p.townId)?.name ?? ''}`,
      icon: 'grid_view',
    })),
    ...world.projects.flatMap((p) =>
      p.sites.map((x) => {
        const { tier, level } = siteLevel(x.done);
        return {
          pick: { type: 'site' as const, id: x.id },
          title: x.name,
          hint: `${p.name} · ${tier ? `Lv ${level}` : 'being built'}`,
          icon: 'apartment',
        };
      }),
    ),
    ...world.people.map((p) => ({
      pick: { type: 'person' as const, id: p.id },
      title: p.isMe ? `${p.name} (you)` : p.name,
      hint: 'Person',
      icon: 'person',
    })),
  ];
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const found = entries
    .filter((e) =>
      words.every((w) => `${e.title} ${e.hint}`.toLowerCase().includes(w)),
    )
    .slice(0, 40);
  return (
    <Card className="pointer-events-auto flex max-h-[50vh] w-full max-w-sm flex-col overflow-hidden">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Go to a project, task or person…"
        className="border-b border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none"
      />
      <ul className="overflow-y-auto p-1">
        {found.map((e) => (
          <li key={`${e.pick.type}:${e.pick.id}`}>
            <button
              onClick={() => onPick(e.pick)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100"
            >
              <span className="material-icons !text-base text-neutral-400">
                {e.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-neutral-900">
                  {e.title}
                </span>
                <span className="block truncate text-[11px] text-neutral-500">
                  {e.hint}
                </span>
              </span>
            </button>
          </li>
        ))}
        {!found.length && (
          <li className="px-2 py-3 text-sm text-neutral-500">Nothing found.</li>
        )}
      </ul>
    </Card>
  );
};

/**
 * The World: companies are towns that grow square by square, projects are
 * squares of task buildings, and every person's Claude works as bots at the
 * buildings, travelling the roads to get there. Finished bots and bots that
 * need permission come back to their owner.
 */
export const WorldPage = () => {
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<Pick | null>(null);
  const [focus, setFocus] = useState<Pick | 'all' | null>(null);
  const [finding, setFinding] = useState(false);

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
  const site =
    selected?.type === 'site'
      ? world?.projects
          .flatMap((p) => p.sites)
          .find((x) => x.id === selected.id)
      : null;
  const siteProject = site
    ? world?.projects.find((p) => p.sites.some((x) => x.id === site.id))
    : null;
  const project =
    selected?.type === 'project'
      ? world?.projects.find((p) => p.id === selected.id)
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
  const projectOf = (id?: string | null) =>
    world?.projects.find((p) => p.id === id);
  const siteOf = (id?: string | null) =>
    world?.projects.flatMap((p) => p.sites).find((x) => x.id === id);

  // Breadcrumb: World › Town › Project › Task.
  const crumbProject =
    project ?? siteProject ?? (bot ? projectOf(bot.projectId) : null);
  const crumbSite = site ?? (bot ? siteOf(bot.siteId) : null);
  const crumbTown =
    town ??
    townOf(
      crumbProject?.townId ??
        bot?.townId ??
        (person ? person.townIds[0] : undefined),
    );
  // The card wears the town's colours.
  const cardColor = accentOf(crumbTown);
  const cardBadge = town
    ? { src: town.brand?.logo ?? town.logo, name: town.name, round: false }
    : project || siteProject
      ? {
          src:
            (project ?? siteProject)!.brand?.logo ??
            (project ?? siteProject)!.logo,
          name: (project ?? siteProject)!.name,
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
            {crumbProject && (
              <>
                <span className="text-neutral-400">›</span>
                <button
                  onClick={() => go({ type: 'project', id: crumbProject.id })}
                  className="font-medium text-neutral-800 hover:underline"
                >
                  {crumbProject.name}
                </button>
              </>
            )}
            {crumbSite && (
              <>
                <span className="text-neutral-400">›</span>
                <button
                  onClick={() => go({ type: 'site', id: crumbSite.id })}
                  className="font-medium text-neutral-800 hover:underline"
                >
                  {crumbSite.name}
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
            {world && world.towns.length > 0 && (
              <button
                onClick={() => setFinding((v) => !v)}
                className="ml-2 flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-neutral-700"
              >
                <span className="material-icons !text-sm">near_me</span>
                Go to
              </button>
            )}
          </Card>

          {finding && world && (
            <GoTo
              world={world}
              onPick={(pick) => {
                setFinding(false);
                go(pick);
              }}
            />
          )}

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
                  {projectOf(b.projectId)
                    ? ` at ${siteOf(b.siteId)?.name ?? projectOf(b.projectId)!.name}`
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
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-blue-600" />
              On the road
            </span>
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
        {(town || project || site || bot || person) && (
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
                    project?.name ??
                    site?.name ??
                    (bot
                      ? `${bot.ownerName}'s bot`
                      : person?.isMe
                        ? 'You'
                        : person?.name)}
                </p>
                <p className="text-xs text-neutral-500">
                  {town &&
                    `Town · ${Math.round(town.weekPoints)} points this week`}
                  {project &&
                    `#${project.rank} in ${townOf(project.townId)?.name} · by ${project.rankedBy.toLowerCase()}`}
                  {site && siteProject && `Task building · ${siteProject.name}`}
                  {bot &&
                    `${BOT_STATE_LABEL[bot.state]}${projectOf(bot.projectId) ? ` · ${siteOf(bot.siteId)?.name ?? projectOf(bot.projectId)!.name}` : ''}`}
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
                <Section title="Projects">
                  <ol className="flex flex-col gap-1">
                    {world!.projects
                      .filter((b) => b.townId === town.id)
                      .map((b) => (
                        <li key={b.id}>
                          <button
                            onClick={() => go({ type: 'project', id: b.id })}
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

            {project && (
              <>
                <Section title="Task buildings">
                  <SiteList
                    project={project}
                    color={cardColor}
                    onOpen={(id) => go({ type: 'site', id })}
                  />
                </Section>
                <Section title="Leaderboard this week">
                  <Leaderboard rows={project.leaderboard} color={cardColor} />
                </Section>
                <Section title="Bots here today">
                  <BotList
                    bots={world!.bots.filter((b) => b.projectId === project.id)}
                    onOpen={(id) => go({ type: 'bot', id })}
                  />
                </Section>
                <p className="mt-3 text-[11px] text-neutral-400">
                  The blue line is the way there from you.
                </p>
              </>
            )}

            {site && <SiteCard site={site} color={cardColor} />}
            {site && (
              <Section title="Bots here today">
                <BotList
                  bots={world!.bots.filter((b) => b.siteId === site.id)}
                  onOpen={(id) => go({ type: 'bot', id })}
                />
              </Section>
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
                  <BotList
                    bots={world!.bots.filter((b) => b.ownerId === person.id)}
                    onOpen={(id) => go({ type: 'bot', id })}
                  />
                  {world!.bots.some((b) => b.ownerId === person.id) && (
                    <p className="mt-2 text-[11px] text-neutral-400">
                      Blue lines show where each bot is working.
                    </p>
                  )}
                </Section>
                {person.isMe && (
                  <Link
                    href={`${APP_ROUTES.settings}#character`}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
                  >
                    <span className="material-symbols-outlined !text-base">
                      checkroom
                    </span>
                    Dress up your character
                  </Link>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
