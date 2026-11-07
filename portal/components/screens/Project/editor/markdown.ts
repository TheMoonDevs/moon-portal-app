import type { Slice } from '@tiptap/pm/model';
import { Extension, InputRule, type JSONContent } from '@tiptap/react';

import { docToMarkdown, markdownToDoc } from '@/lib/workspace/pageMarkdown';

/*
 * Markdown in the page editor. Most typing shortcuts come with Tiptap's own
 * blocks (# headings, - and 1. lists, [] to-dos, > quotes, ``` code, ---,
 * **bold**, *italic*, `code`, ~~strike~~, ==highlight==, ![](image)). This
 * adds the rest: [text](link) as you type, Markdown pasted from anywhere
 * turned into blocks, and copied blocks put on the clipboard as Markdown.
 */

/** `[text](https://…)` becomes a link as soon as its `)` is typed. */
export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',
  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|[^!])(\[([^\]]+)\]\((\S+?)\))$/,
        handler: ({ state, range, match }) => {
          const [whole, , label, href] = match;
          const link = state.schema.marks.link;
          if (!link) return null;
          // Skip the character before the "[" the pattern had to look at.
          const from = range.from + (whole.length - match[1].length);
          state.tr
            .replaceWith(
              from,
              range.to,
              state.schema.text(label, [link.create({ href })]),
            )
            .removeStoredMark(link);
        },
      }),
    ];
  },
});

const BLOCK_SYNTAX =
  /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|~~~|\|.*\|\s*$|-{3,}\s*$|<(aside|details|iframe|page)\b|!\[)/m;
const INLINE_SYNTAX =
  /\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|==[^=\n]+==|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)/;
/** HTML that already carries the formatting, e.g. copied from a web page. */
const RICH_HTML =
  /<(h[1-6]|ul|ol|li|strong|b|em|i|a|table|blockquote|pre|code|img|hr)[\s>]/i;

/**
 * Whether pasted text should be read as Markdown: it has Markdown in it, and
 * no richer copy of it came along (a web page or a doc pastes its own HTML).
 */
export const isMarkdownPaste = (text: string, html: string) =>
  !!text.trim() &&
  (BLOCK_SYNTAX.test(text) || INLINE_SYNTAX.test(text)) &&
  !RICH_HTML.test(html);

const clampHeadings = (nodes: JSONContent[] = []): JSONContent[] =>
  nodes.map((n) => ({
    ...n,
    ...(n.type === 'heading' && {
      attrs: { ...n.attrs, level: Math.min(3, Number(n.attrs?.level) || 1) },
    }),
    ...(n.content && { content: clampHeadings(n.content) }),
  }));

/**
 * The blocks for some Markdown, ready to insert. A single line comes back as
 * its text and marks, so it lands inside the line being written.
 */
export const markdownContent = (markdown: string): JSONContent[] => {
  const doc = markdownToDoc(markdown) as JSONContent;
  const blocks = clampHeadings(doc.content);
  if (blocks.length === 1 && blocks[0].type === 'paragraph')
    return blocks[0].content ?? [];
  return blocks;
};

/** A copied part of a page, as Markdown for the clipboard's plain text. */
export const sliceToMarkdown = (slice: Slice) => {
  const { content } = slice;
  // Text from inside one code block copies as it is.
  if (content.childCount === 1 && content.firstChild?.type.spec.code)
    return content.firstChild.textContent;
  const json = (content.toJSON() ?? []) as JSONContent[];
  const blocks = content.firstChild?.isInline
    ? [{ type: 'paragraph', content: json }]
    : json;
  return docToMarkdown({ type: 'doc', content: blocks });
};
