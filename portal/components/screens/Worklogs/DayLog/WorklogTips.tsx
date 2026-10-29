'use client';

import { useEffect, useState } from 'react';

import { Icon } from '../../Admin/shared/AdminUI';

/*
 * Tips for the worklog page: how to write tasks, its keys, and where
 * Claude's work goes.
 */

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-neutral-300 auto-light:border-black/15 auto-light:bg-black/[0.06] auto-light:text-neutral-700">
    {children}
  </kbd>
);

const TIPS = [
  'One short task per thing you work on.',
  'Add a note in a task’s details as things happen.',
  'Tick a task done as you finish it. Unfinished ones stay pending until you finish or archive them.',
  'Before you stop, write tomorrow down: it counts as planned.',
  'A task is put in a project from its words. Change it from its details.',
];

export const WorklogTips = () => {
  // Alt is called Option (⌥) on a Mac.
  const [alt, setAlt] = useState('Alt');
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))
      setAlt('⌥');
  }, []);

  const keys: [React.ReactNode, string][] = [
    [<Kbd key="e">Enter</Kbd>, 'Next task'],
    [<Kbd key="b">Backspace</Kbd>, 'On an empty task, takes it out'],
    [<Kbd key="a">↑ ↓</Kbd>, 'Move between tasks'],
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
      </section>
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Claude’s work
        </h4>
        <p className="text-xs leading-5 text-neutral-400 auto-light:text-neutral-500">
          What Claude logs goes under the task it is for, as notes in the task’s
          details. When it has no task for the work, it makes one. To move a
          note under another task, open the details and use{' '}
          <Icon name="swap_vert" className="align-middle text-[13px]" />.
        </p>
      </section>
    </div>
  );
};
