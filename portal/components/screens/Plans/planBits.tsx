'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { inlineMarkdown } from '@/lib/workspace/pageMarkdown';

import { Icon } from '../Admin/shared/AdminUI';
import type { ProjectChoice, StepView } from './types';

/* Small pieces shared by the plan editor, its steps and the step sidebar. */

export const ProjectDot = ({ project }: { project?: ProjectChoice }) => (
  <span
    className="size-2 shrink-0 rounded-full"
    style={{ backgroundColor: project?.color || '#525252' }}
  />
);

const MARK_CLASS: Record<string, string> = {
  bold: 'font-semibold text-white',
  italic: 'italic',
  strike: 'line-through opacity-70',
  code: 'rounded bg-white/[0.08] px-1 py-px font-mono text-[0.9em] text-rose-200',
  highlight: 'rounded-sm bg-amber-300/25 px-0.5 text-amber-50',
  link: 'text-sky-300 underline decoration-sky-300/40 underline-offset-2 hover:decoration-sky-300',
};

/** "# ", "## " or "### " at the start of a step: a heading of that size. */
export const headingOf = (text: string) => {
  const m = /^(#{1,3})\s+([\s\S]*)$/.exec(text);
  return m ? { level: m[1].length, text: m[2] } : null;
};

/** Whether a line has Markdown worth showing formatted. */
export const hasMarkdown = (text: string) =>
  !!headingOf(text) ||
  /\*\*|__|~~|==|`|\[[^\]]+\]\(|(^|\s)[*_][^\s*_]/.test(text);

/** One line of Markdown shown formatted: bold, italic, code, links… */
export const MarkdownText = ({ text }: { text: string }) => (
  <>
    {inlineMarkdown(text).map((piece, i) => {
      const className = cn(piece.marks.map((m) => MARK_CLASS[m]));
      if (piece.href)
        return (
          <a
            key={i}
            href={piece.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={className}
          >
            {piece.text}
          </a>
        );
      return piece.marks.length ? (
        <span key={i} className={className}>
          {piece.text}
        </span>
      ) : (
        piece.text
      );
    })}
  </>
);

/** A few lines of Markdown: each line formatted, "- " lines as bullets. */
export const MarkdownLines = ({ text }: { text: string }) => (
  <>
    {text.split('\n').map((line, i) => {
      const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
      const todo = /^\s*[-*+]?\s*\[([ xX])\]\s+(.*)$/.exec(line);
      if (todo)
        return (
          <span key={i} className="flex gap-1.5">
            <span>{todo[1] === ' ' ? '☐' : '☑'}</span>
            <span className={cn(todo[1] !== ' ' && 'line-through opacity-60')}>
              <MarkdownText text={todo[2]} />
            </span>
          </span>
        );
      if (bullet)
        return (
          <span key={i} className="flex gap-1.5">
            <span>•</span>
            <span>
              <MarkdownText text={bullet[1]} />
            </span>
          </span>
        );
      return (
        <span key={i} className="block min-h-5">
          <MarkdownText text={line} />
        </span>
      );
    })}
  </>
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
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
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
