import type { JsonObject } from '@/models/shared/base';

/*
 * Pages are Tiptap documents; assistants read and write them as Markdown.
 * This covers what the page editor can show: headings, paragraphs, bulleted,
 * numbered and to-do lists (nested by indent), quotes, code blocks, rules,
 * tables, images, and bold, italic, strike, code, highlight and links inside
 * a line. Blocks Markdown has no syntax for are written as small HTML tags,
 * the way Notion exports them:
 *
 *   <aside>💡 A callout</aside>
 *   <details><summary>A toggle</summary> ...body... </details>
 *   <iframe src="https://youtu.be/..."></iframe>   (an embed)
 *   <page id="...">Title</page>                    (a link to a page)
 *   [TOC]                                          (table of contents)
 */

type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  text?: string;
  marks?: Mark[];
};

/* --------------------------------- Inline --------------------------------- */

const INLINE: { re: RegExp; mark: (m: RegExpExecArray) => Mark; raw?: true }[] =
  [
    { re: /`([^`]+)`/, mark: () => ({ type: 'code' }), raw: true },
    {
      re: /\[([^\]]+)\]\(([^)\s]+)\)/,
      mark: (m) => ({ type: 'link', attrs: { href: m[2] } }),
    },
    { re: /\*\*(.+?)\*\*/, mark: () => ({ type: 'bold' }) },
    { re: /__(.+?)__/, mark: () => ({ type: 'bold' }) },
    { re: /~~(.+?)~~/, mark: () => ({ type: 'strike' }) },
    { re: /==(.+?)==/, mark: () => ({ type: 'highlight' }) },
    { re: /\*([^*\s][^*]*?)\*/, mark: () => ({ type: 'italic' }) },
    {
      re: /(?<![\w])_([^_\s][^_]*?)_(?![\w])/,
      mark: () => ({ type: 'italic' }),
    },
  ];

function inline(text: string, marks: Mark[] = []): Node[] {
  if (!text) return [];
  let best: {
    at: number;
    m: RegExpExecArray;
    rule: (typeof INLINE)[0];
  } | null = null;
  for (const rule of INLINE) {
    const m = rule.re.exec(text);
    if (m && (!best || m.index < best.at)) best = { at: m.index, m, rule };
  }
  const plain = (t: string): Node[] =>
    t ? [{ type: 'text', text: t, ...(marks.length && { marks }) }] : [];
  if (!best) return plain(text);
  const { at, m, rule } = best;
  const inner = [...marks, rule.mark(m)];
  return [
    ...plain(text.slice(0, at)),
    ...(rule.raw
      ? [{ type: 'text', text: m[1], marks: inner }]
      : inline(m[1], inner)),
    ...inline(text.slice(at + m[0].length), marks),
  ];
}

/** The text and marks of one line of Markdown, e.g. a plan step's title. */
export type InlinePiece = { text: string; marks: string[]; href?: string };

export function inlineMarkdown(text: string): InlinePiece[] {
  return inline(text).map((n) => ({
    text: n.text ?? '',
    marks: (n.marks ?? []).map((m) => m.type),
    href: n.marks?.find((m) => m.type === 'link')?.attrs?.href as
      | string
      | undefined,
  }));
}

/** A line of Markdown as plain words: "## **Ship** it" is "Ship it". */
export const stripMarkdown = (text: string) =>
  inline(
    text.replace(/^\s*(#{1,6}\s+|[-*+]\s+(\[[ xX]\]\s+)?|\[[ xX]\]\s+)/, ''),
  )
    .map((n) => n.text ?? '')
    .join('');

/* --------------------------------- Blocks --------------------------------- */

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;
const indentOf = (line: string) =>
  line.match(/^\s*/)![0].replace(/\t/g, '  ').length;

/** Single line breaks inside a paragraph stay line breaks (plan notes). */
let keepBreaks = false;

const paragraph = (text: string): Node => {
  const lines = text.trim().split('\n');
  const content = lines.flatMap((line, i) => [
    ...(i ? [{ type: 'hardBreak' }] : []),
    ...inline(line.trim()),
  ]);
  return content.length
    ? { type: 'paragraph', content }
    : { type: 'paragraph' };
};

function blocks(lines: string[]): Node[] {
  const out: Node[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const found = special(lines, i);
    if (found) {
      out.push(found[0]);
      i = found[1];
      continue;
    }

    const fence = trimmed.match(/^(```|~~~)\s*([\w+-]*)/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1]))
        body.push(lines[i++]);
      i++;
      const text = body.join('\n');
      out.push({
        type: 'codeBlock',
        attrs: { language: fence[2] || null },
        ...(text && { content: [{ type: 'text', text }] }),
      });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const content = inline(heading[2].trim());
      out.push({
        type: 'heading',
        attrs: { level: heading[1].length },
        ...(content.length && { content }),
      });
      i++;
      continue;
    }

    if (/^([-*_])(\s*\1){2,}$/.test(trimmed)) {
      out.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>'))
        quoted.push(lines[i++].trim().replace(/^>\s?/, ''));
      out.push({ type: 'blockquote', content: blocks(quoted) });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const [list, next] = parseList(lines, i);
      out.push(list);
      i = next;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !LIST_ITEM.test(lines[i]) &&
      !/^(#{1,6}\s|>|```|~~~|<(aside|details|iframe|page)\b|\[TOC\]$|!\[)/i.test(
        lines[i].trim(),
      ) &&
      !(
        lines[i].trim().startsWith('|') &&
        TABLE_RULE.test(lines[i + 1]?.trim() ?? '')
      )
    )
      para.push(lines[i++].trim());
    out.push(paragraph(para.join(keepBreaks ? '\n' : ' ')));
  }
  return out;
}

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';

const unescape = (text: string) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

const EMOJI_START =
  /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u;

/**
 * The lines from `start` up to the matching `</tag>`, without the outer
 * tags. Tags of the same kind inside (a toggle in a toggle) are kept.
 */
function until(lines: string[], start: number, tag: string) {
  const open = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  const close = `</${tag}>`;
  const inner: string[] = [];
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    let line = lines[i];
    if (i === start) {
      const first = line.match(new RegExp(`^\\s*<${tag}\\b[^>]*>`, 'i'))!;
      line = line.slice(first[0].length);
    }
    // Walk the line's tags in order to find where this block closes.
    let at = 0;
    for (;;) {
      open.lastIndex = at;
      const o = open.exec(line);
      const c = line.toLowerCase().indexOf(close, at);
      if (c < 0 && !o) break;
      if (o && (c < 0 || o.index < c)) {
        depth++;
        at = o.index + o[0].length;
        continue;
      }
      if (depth === 0) {
        inner.push(line.slice(0, c));
        return { inner, next: i + 1 };
      }
      depth--;
      at = c + close.length;
    }
    inner.push(line);
  }
  return { inner, next: lines.length };
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));

const TABLE_RULE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

/** Blocks Markdown has no syntax for, and tables and images. */
function special(lines: string[], i: number): [Node, number] | null {
  const trimmed = lines[i].trim();

  if (/^\[TOC\]$/i.test(trimmed)) return [{ type: 'tableOfContents' }, i + 1];

  const image = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
  if (image)
    return [
      { type: 'image', attrs: { src: image[2], alt: image[1] || null } },
      i + 1,
    ];

  const iframe = trimmed.match(/^<iframe\b[^>]*>/i);
  if (iframe) {
    const src = unescape(attr(iframe[0], 'src'));
    const end = lines.slice(i).findIndex((l) => /<\/iframe>/i.test(l));
    return [{ type: 'embed', attrs: { src } }, i + Math.max(end, 0) + 1];
  }

  const page = trimmed.match(/^<page\b([^>]*)>(.*?)<\/page>$/i);
  if (page)
    return [
      {
        type: 'pageLink',
        attrs: { pageId: attr(page[1], 'id'), title: unescape(page[2]) },
      },
      i + 1,
    ];

  if (/^<aside\b[^>]*>/i.test(trimmed)) {
    const { inner, next } = until(lines, i, 'aside');
    const text = inner.join('\n').trim();
    const emoji = text.match(EMOJI_START);
    const body = blocks(
      (emoji ? text.slice(emoji[0].length) : text).split('\n'),
    );
    return [
      {
        type: 'callout',
        attrs: { emoji: emoji?.[1] ?? '💡' },
        content: body.length ? body : [{ type: 'paragraph' }],
      },
      next,
    ];
  }

  if (/^<details\b[^>]*>/i.test(trimmed)) {
    const { inner, next } = until(lines, i, 'details');
    let text = inner.join('\n');
    let summary = '';
    const sm = text.match(/<summary>([\s\S]*?)<\/summary>/i);
    if (sm) {
      summary = sm[1].trim();
      text = text.replace(sm[0], '');
    }
    const body = blocks(text.split('\n'));
    const title = inline(summary);
    return [
      {
        type: 'toggle',
        attrs: { open: /\bopen\b/i.test(trimmed) },
        content: [
          { type: 'toggleSummary', ...(title.length && { content: title }) },
          {
            type: 'toggleBody',
            content: body.length ? body : [{ type: 'paragraph' }],
          },
        ],
      },
      next,
    ];
  }

  if (
    trimmed.startsWith('|') &&
    i + 1 < lines.length &&
    TABLE_RULE.test(lines[i + 1].trim())
  ) {
    const head = cells(trimmed);
    const rows: string[][] = [];
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith('|'))
      rows.push(cells(lines[j++]));
    const width = Math.max(head.length, ...rows.map((r) => r.length));
    const row = (values: string[], type: string): Node => ({
      type: 'tableRow',
      content: Array.from({ length: width }, (_, k) => ({
        type,
        content: [paragraph(values[k] ?? '')],
      })),
    });
    return [
      {
        type: 'table',
        content: [
          row(head, 'tableHeader'),
          ...rows.map((r) => row(r, 'tableCell')),
        ],
      },
      j,
    ];
  }

  return null;
}

/** A list from `start`, with items nested by indent. Returns where it ends. */
function parseList(lines: string[], start: number): [Node, number] {
  const first = lines[start].match(LIST_ITEM)!;
  const base = indentOf(lines[start]);
  const ordered = /\d/.test(first[2]);
  const isTask = !ordered && TASK.test(first[3]);
  const items: Node[] = [];
  let i = start;

  while (i < lines.length) {
    const m = lines[i].match(LIST_ITEM);
    if (!m || indentOf(lines[i]) !== base) break;
    if (/\d/.test(m[2]) !== ordered || (!ordered && TASK.test(m[3]) !== isTask))
      break;
    i++;
    // The item's own lines: anything deeper than its marker, and blank lines
    // between them.
    const body: string[] = [];
    while (i < lines.length) {
      if (!lines[i].trim()) {
        const nextFilled = lines.slice(i).find((l) => l.trim());
        if (!nextFilled || indentOf(nextFilled) <= base) break;
        body.push('');
        i++;
        continue;
      }
      if (indentOf(lines[i]) <= base) break;
      body.push(lines[i++]);
    }
    const depth = Math.min(
      ...body.filter((l) => l.trim()).map(indentOf),
      Infinity,
    );
    const nested = blocks(
      body.map((l) =>
        l.replace(/\t/g, '  ').slice(Number.isFinite(depth) ? depth : 0),
      ),
    );
    const task = isTask ? m[3].match(TASK) : null;
    items.push({
      type: isTask ? 'taskItem' : 'listItem',
      ...(task && { attrs: { checked: task[1].toLowerCase() === 'x' } }),
      content: [paragraph(task ? task[2] : m[3]), ...nested],
    });
    // A blank line between items of the same list keeps the list going.
    while (i < lines.length && !lines[i].trim()) {
      const nextFilled = lines.slice(i).find((l) => l.trim());
      const nm = nextFilled?.match(LIST_ITEM);
      if (!nm || indentOf(nextFilled!) !== base) break;
      i++;
    }
  }

  const type = ordered ? 'orderedList' : isTask ? 'taskList' : 'bulletList';
  const startAt = ordered ? parseInt(first[2], 10) : 1;
  return [
    {
      type,
      ...(ordered && startAt !== 1 && { attrs: { start: startAt } }),
      content: items,
    },
    i,
  ];
}

/**
 * A Tiptap document from Markdown. With `breaks`, a single line break stays a
 * line break instead of joining the lines (notes written as plain text).
 */
export function markdownToDoc(
  markdown: string,
  { breaks = false }: { breaks?: boolean } = {},
): JsonObject {
  keepBreaks = breaks;
  let content: Node[];
  try {
    content = blocks(markdown.replace(/\r\n?/g, '\n').split('\n'));
  } finally {
    keepBreaks = false;
  }
  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph' }],
  } as unknown as JsonObject;
}

/* ------------------------------ Back to text ------------------------------ */

const MARK_WRAP: Record<string, [string, string]> = {
  bold: ['**', '**'],
  italic: ['*', '*'],
  strike: ['~~', '~~'],
  code: ['`', '`'],
  highlight: ['==', '=='],
  underline: ['', ''],
};

function inlineText(nodes: Node[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === 'hardBreak') return '\n';
      let text = n.text ?? inlineText(n.content);
      for (const mark of n.marks ?? []) {
        if (mark.type === 'link')
          text = `[${text}](${String(mark.attrs?.href ?? '')})`;
        else {
          const [open, close] = MARK_WRAP[mark.type] ?? ['', ''];
          text = `${open}${text}${close}`;
        }
      }
      return text;
    })
    .join('');
}

const escapeAttr = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');

const escapeText = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');

const indent = (text: string, by: string) =>
  text
    .split('\n')
    .map((l, i) => (i === 0 || !l ? l : by + l))
    .join('\n');

function blockText(node: Node): string {
  switch (node.type) {
    case 'heading':
      return `${'#'.repeat(Number(node.attrs?.level) || 1)} ${inlineText(node.content)}`;
    case 'paragraph':
      return inlineText(node.content);
    case 'blockquote':
      return docBlocks(node.content)
        .split('\n')
        .map((l) => (l ? `> ${l}` : '>'))
        .join('\n');
    case 'codeBlock':
      return `\`\`\`${node.attrs?.language ?? ''}\n${inlineText(node.content)}\n\`\`\``;
    case 'horizontalRule':
      return '---';
    case 'image':
      return `![${String(node.attrs?.alt ?? '')}](${String(node.attrs?.src ?? '')})`;
    case 'embed':
      return `<iframe src="${escapeAttr(node.attrs?.src)}"></iframe>`;
    case 'pageLink':
      return `<page id="${escapeAttr(node.attrs?.pageId)}">${escapeText(node.attrs?.title)}</page>`;
    case 'tableOfContents':
      return '[TOC]';
    case 'callout':
      return `<aside>\n${node.attrs?.emoji ?? '💡'} ${docBlocks(node.content)}\n</aside>`;
    case 'toggle': {
      const [summary, body] = node.content ?? [];
      return `<details${node.attrs?.open ? ' open' : ''}>\n<summary>${inlineText(summary?.content)}</summary>\n\n${docBlocks(body?.content)}\n\n</details>`;
    }
    case 'table': {
      const rows = (node.content ?? []).map((row) =>
        (row.content ?? []).map((cell) =>
          docBlocks(cell.content).replace(/\n+/g, ' ').replace(/\|/g, '\\|'),
        ),
      );
      if (!rows.length) return '';
      const width = Math.max(...rows.map((r) => r.length));
      const line = (r: string[]) =>
        `| ${Array.from({ length: width }, (_, k) => r[k] ?? '').join(' | ')} |`;
      return [
        line(rows[0]),
        `|${' --- |'.repeat(width)}`,
        ...rows.slice(1).map(line),
      ].join('\n');
    }
    case 'bulletList':
    case 'orderedList':
    case 'taskList': {
      let n = Number(node.attrs?.start) || 1;
      return (node.content ?? [])
        .map((item) => {
          const marker =
            node.type === 'orderedList'
              ? `${n++}.`
              : node.type === 'taskList'
                ? `- [${item.attrs?.checked ? 'x' : ' '}]`
                : '-';
          const body = (item.content ?? []).map(blockText).join('\n');
          return `${marker} ${indent(body, ' '.repeat(marker.length + 1))}`;
        })
        .join('\n');
    }
    default:
      return node.content ? docBlocks(node.content) : (node.text ?? '');
  }
}

const docBlocks = (nodes: Node[] = []) => nodes.map(blockText).join('\n\n');

/** Markdown from a Tiptap document. */
export function docToMarkdown(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  return docBlocks((doc as Node).content).trim();
}
