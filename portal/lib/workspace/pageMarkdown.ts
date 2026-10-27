import type { JsonObject } from '@/models/shared/base';

/*
 * Pages are Tiptap documents; assistants read and write them as Markdown.
 * This covers what the page editor can show: headings, paragraphs, bulleted,
 * numbered and to-do lists (nested by indent), quotes, code blocks, rules,
 * and bold, italic, strike, code, highlight and links inside a line.
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

/* --------------------------------- Blocks --------------------------------- */

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;
const indentOf = (line: string) =>
  line.match(/^\s*/)![0].replace(/\t/g, '  ').length;

const paragraph = (text: string): Node => {
  const content = inline(text.trim());
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
      !/^(#{1,6}\s|>|```|~~~)/.test(lines[i].trim())
    )
      para.push(lines[i++].trim());
    out.push(paragraph(para.join(' ')));
  }
  return out;
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

/** A Tiptap document from Markdown. */
export function markdownToDoc(markdown: string): JsonObject {
  const content = blocks(markdown.replace(/\r\n?/g, '\n').split('\n'));
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
