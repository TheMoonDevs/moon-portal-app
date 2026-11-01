'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from '../Admin/shared/AdminUI';
import type { ProjectChoice, StepView } from './types';

/* Small pieces shared by the plan editor, its steps and the step sidebar. */

export const ProjectDot = ({ project }: { project?: ProjectChoice }) => (
  <span
    className="size-2 shrink-0 rounded-full"
    style={{ backgroundColor: project?.color || '#525252' }}
  />
);

/** A textarea that grows with its text. */
export const GrowingText = ({
  value,
  onChange,
  className,
  selectOnMount,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Focus and select the text when it first shows. */
  selectOnMount?: boolean;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  /** Gets the box, e.g. to move the cursor into it from elsewhere. */
  boxRef?: (el: HTMLTextAreaElement | null) => void;
}) => {
  const { boxRef, ...rest } = props;
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (selectOnMount) ref.current?.select();
    // Only when it first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        boxRef?.(el);
      }}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full resize-none bg-transparent focus:outline-none disabled:cursor-default',
        className,
      )}
      {...rest}
    />
  );
};

/** Projects as a tree: each under its parent, with its depth. */
export const projectTree = (projects: ProjectChoice[]) => {
  const ids = new Set(projects.map((p) => p.id));
  const out: { project: ProjectChoice; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) =>
    projects
      .filter((p) =>
        parentId
          ? p.parentId === parentId
          : !p.parentId || !ids.has(p.parentId),
      )
      .forEach((p) => {
        out.push({ project: p, depth });
        walk(p.id, depth + 1);
      });
  walk(null, 0);
  return out;
};

/** Options for a project select, sub-projects indented under theirs. */
export const ProjectOptions = ({
  projects,
  disabled,
}: {
  projects: ProjectChoice[];
  disabled?: (p: ProjectChoice) => boolean;
}) => (
  <>
    {projectTree(projects).map(({ project, depth }) => (
      <option
        key={project.id}
        value={project.id}
        disabled={disabled?.(project)}
      >
        {`${'\u00a0\u00a0'.repeat(depth)}${depth ? '└ ' : ''}${project.name}`}
      </option>
    ))}
  </>
);

export const findProject = (projects: ProjectChoice[], id: string) =>
  projects.find((p) => p.id === id);

/** A goal step's star and where the goal stands. */
export const GoalStar = ({ met }: { met: boolean }) => (
  <Icon
    name="star"
    filled={met}
    className={cn('text-[18px]', met ? 'text-amber-300' : 'text-neutral-600')}
  />
);

export const goalLine = (goal: NonNullable<StepView['goal']>) =>
  `${goal.done.toLocaleString()}/${goal.target.toLocaleString()}${
    goal.kind === 'scheduled' ? ` this ${goal.period}` : ''
  }`;
