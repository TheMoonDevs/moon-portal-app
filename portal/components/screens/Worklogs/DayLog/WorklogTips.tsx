'use client';

import { useEffect, useState } from 'react';

import { ORIGIN_KEYS, POINT_ORIGINS } from '@/lib/worklogs/origin';

import { Icon } from '../../Admin/shared/AdminUI';
import { OriginTag } from './OriginBar';

/*
 * Tips for the worklog page: how to write points, its keys, and what the
 * planned, unexpected and delayed tags mean.
 */

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-neutral-300 auto-light:border-black/15 auto-light:bg-black/[0.06] auto-light:text-neutral-700">
    {children}
  </kbd>
);

const TIPS = [
  'One short point per thing you work on.',
  'Note every small update as it happens.',
  'Tick a point done as you finish it.',
  'Before you stop, write tomorrow down: it counts as planned.',
  'Pick a point’s project from the chip under it. Points in a project are its tasks.',
];

export const WorklogTips = () => {
  // Alt is called Option (⌥) on a Mac.
  const [alt, setAlt] = useState('Alt');
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))
      setAlt('⌥');
  }, []);

  const keys: [React.ReactNode, string][] = [
    [<Kbd key="e">Enter</Kbd>, 'Next point'],
    [<Kbd key="b">Backspace</Kbd>, 'On an empty point, takes it out'],
    [<Kbd key="a">↑ ↓</Kbd>, 'Move between points'],
    [
      <>
        <Kbd>Ctrl</Kbd> <Kbd>Space</Kbd>
      </>,
      'Done',
    ],
    [
      <>
        <Kbd>Ctrl</Kbd> <Kbd>P</Kbd>
      </>,
      'Doing',
    ],
    [
      <>
        <Kbd>Ctrl</Kbd> <Kbd>Q</Kbd>
      </>,
      'Not done',
    ],
    [
      <>
        <Kbd>{alt}</Kbd> <Kbd>4</Kbd>
      </>,
      'Blocked',
    ],
    [
      <>
        <Kbd>{alt}</Kbd> <Kbd>8</Kbd>
      </>,
      'Waiting on someone',
    ],
  ];

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm auto-light:border-black/10 auto-light:bg-white">
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Worklog tips
        </h4>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-neutral-300 auto-light:text-neutral-700">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ol>
      </section>
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Keys
        </h4>
        <ul className="flex flex-col gap-1.5">
          {keys.map(([key, label]) => (
            <li key={label} className="flex items-center gap-3">
              <span className="flex w-28 shrink-0 gap-0.5">{key}</span>
              <span className="text-neutral-400 auto-light:text-neutral-500">
                {label}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
          <Icon name="lock" className="text-[13px]" />
          Start a point with{' '}
          <code className="text-neutral-300 auto-light:text-neutral-700">
            p:
          </code>{' '}
          to keep it to yourself.
        </p>
      </section>
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          How a point came
        </h4>
        <ul className="flex flex-col gap-2">
          {ORIGIN_KEYS.map((k) => (
            <li key={k} className="flex items-start gap-2.5">
              <OriginTag origin={k} className="mt-0.5" />
              <span className="text-xs leading-5 text-neutral-400 auto-light:text-neutral-500">
                {POINT_ORIGINS[k].hint}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Claude’s notes
        </h4>
        <p className="text-xs leading-5 text-neutral-400 auto-light:text-neutral-500">
          What Claude logs sits under the point it belongs to. When it can’t
          tell which, it shows a{' '}
          <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-1.5 font-semibold text-violet-200 auto-light:text-violet-700">
            ?
          </span>
          . Click it and type a few letters to pick the point.
        </p>
      </section>
    </div>
  );
};
