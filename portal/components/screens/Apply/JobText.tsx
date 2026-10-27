'use client';

import {
  createElement,
  Fragment,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

import { Icon } from '../Admin/shared/AdminUI';

/**
 * Job posts are written as plain text or light Markdown, usually pasted from
 * a job board: lines starting with "-", "*" or "1." are bullets, a short line
 * on its own above other text ("Core Requirements", "Perks:", "## Perks",
 * "**Perks**") is a heading, and **text** is bold.
 */
const BULLET = /^(?:[-*•]|\d{1,2}[.)])\s+/;
const NUMBERED = /^\d/;
const LINK = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/;
/** "Stipend: ₹15,000 a month" shows its label in bold. */
const LABEL = /^([^:]{1,24}):\s+(.+)$/;
const MD_HEADING = /^#{1,6}\s+/;
/** A line that is all bold, like "**Core Requirements**" or "**Stipend:**". */
const BOLD_LINE = /^\*\*([^*]+?)\*\*\s*(:?)$/;
/** **text**, but not "2 ** 3" or "** loose **". */
const BOLD = /\*\*(\S(?:.*?\S)?)\*\*/;

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'paragraph'; lines: string[] };

const looksLikeHeading = (line: string) =>
  line.length <= 48 &&
  !/[.!?,;]$/.test(line) &&
  !LINK.test(line) &&
  !LABEL.test(line) &&
  !line.includes('**');

export function jobTextBlocks(text: string): Block[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim());
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const endParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', lines: paragraph });
    paragraph = [];
  };

  const heading = (text: string) => {
    endParagraph();
    blocks.push({ kind: 'heading', text });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) {
      endParagraph();
      continue;
    }
    if (MD_HEADING.test(line)) {
      heading(line.replace(MD_HEADING, '').replace(/\*\*|:$/g, ''));
      continue;
    }
    if (BULLET.test(line)) {
      endParagraph();
      const item = line.replace(BULLET, '');
      const ordered = NUMBERED.test(line);
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'list' && last.ordered === ordered)
        last.items.push(item);
      else blocks.push({ kind: 'list', ordered, items: [item] });
      continue;
    }
    const bold = BOLD_LINE.exec(line);
    if (bold) {
      const label = bold[1].replace(/:$/, '').trim();
      const isLabel = bold[2] === ':' || bold[1].endsWith(':');
      const next = lines[i + 1] ?? '';
      // "**Stipend:**" with its value on the next line reads as one line.
      if (
        isLabel &&
        next &&
        !BULLET.test(next) &&
        !BOLD_LINE.test(next) &&
        !MD_HEADING.test(next)
      ) {
        paragraph.push(`**${label}:** ${next}`);
        i += 1;
        continue;
      }
      if (label.length <= 60 && !/[.!?]$/.test(label)) {
        heading(label);
        continue;
      }
    }
    const hasMore = lines.slice(i + 1).some(Boolean);
    if (!paragraph.length && hasMore && looksLikeHeading(line)) {
      heading(line.replace(/:$/, ''));
      continue;
    }
    paragraph.push(line);
  }
  endParagraph();
  return blocks;
}

const withLinks = (text: string): ReactNode[] =>
  text.split(LINK).map((part, i) =>
    i % 2 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-all text-white underline decoration-white/30 underline-offset-2 hover:decoration-white"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );

const withBold = (text: string): ReactNode[] =>
  text.split(BOLD).map((part, i) =>
    i % 2 ? (
      <strong key={i} className="font-semibold text-neutral-100">
        {withLinks(part)}
      </strong>
    ) : (
      <Fragment key={i}>{withLinks(part)}</Fragment>
    ),
  );

const inline = (line: string): ReactNode => {
  if (BOLD.test(line)) return withBold(line);
  const label = LABEL.exec(line);
  if (!label || LINK.test(label[1])) return withLinks(line);
  return (
    <>
      <strong className="font-semibold text-neutral-100">{label[1]}:</strong>{' '}
      {withLinks(label[2])}
    </>
  );
};

export const JobText = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-col gap-3 text-sm leading-relaxed text-neutral-300',
      className,
    )}
  >
    {jobTextBlocks(text).map((block, i) =>
      block.kind === 'heading' ? (
        <h3 key={i} className="-mb-1 pt-1 font-semibold text-white">
          {block.text}
        </h3>
      ) : block.kind === 'list' ? (
        createElement(
          block.ordered ? 'ol' : 'ul',
          {
            key: i,
            className: cn(
              'flex flex-col gap-1 pl-5 marker:text-neutral-500',
              block.ordered ? 'list-decimal' : 'list-disc',
            ),
          },
          block.items.map((item, j) => <li key={j}>{inline(item)}</li>),
        )
      ) : (
        <p key={i}>
          {block.lines.map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {inline(line)}
            </Fragment>
          ))}
        </p>
      ),
    )}
  </div>
);

/** Height of the details before "Read more", in px (max-h-60). */
const COLLAPSED_HEIGHT = 240;

/** The full job post below the summary, folded when it is long. */
export const JobDetails = ({ text }: { text: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // A little slack, so a fold never hides just a line or two.
    if (ref.current) setLong(ref.current.scrollHeight > COLLAPSED_HEIGHT + 48);
  }, [text]);

  const folded = long && !expanded;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white">About the role</h2>
      <div
        ref={ref}
        className={cn('relative', folded && 'max-h-60 overflow-hidden')}
      >
        <JobText text={text} />
        {folded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-neutral-950 to-transparent" />
        )}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex items-center gap-1 self-start text-sm font-medium text-white hover:text-neutral-300"
        >
          {expanded ? 'Show less' : 'Read the full details'}
          <Icon
            name={expanded ? 'expand_less' : 'expand_more'}
            className="text-[18px]"
          />
        </button>
      )}
    </section>
  );
};
