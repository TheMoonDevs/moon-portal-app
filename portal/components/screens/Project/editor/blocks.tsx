'use client';

import { Extension, mergeAttributes, Node } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import {
  type JSONContent,
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { createContext, useContext, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from '../../Admin/shared/AdminUI';
import { embedPlayer, safeUrl } from './embeds';

/* -------------------------------------------------------------------------- */
/*                         Links to other pages (context)                     */
/* -------------------------------------------------------------------------- */

export type PageTarget = { id: string; title: string; emoji?: string | null };

/** The pages a document can link to, and how to open or make one. */
export type DocLinks = {
  pages: PageTarget[];
  /** The page being edited, left out of "Link to page". */
  currentId?: string | null;
  open: (id: string) => void;
  /** Makes a page inside this one; "/page" is offered only with it. */
  create?: () => Promise<PageTarget | null>;
};

export const DocLinksContext = createContext<DocLinks | null>(null);

/* -------------------------------------------------------------------------- */
/*                                   Callout                                  */
/* -------------------------------------------------------------------------- */

const CALLOUT_EMOJIS = [
  '💡',
  '⚠️',
  '📌',
  '✅',
  '❗',
  '🔥',
  'ℹ️',
  '🚀',
  '📝',
  '❓',
];

const CalloutView = ({ node, updateAttributes, editor }: NodeViewProps) => (
  <NodeViewWrapper className="doc-callout">
    <button
      type="button"
      contentEditable={false}
      disabled={!editor.isEditable}
      title={editor.isEditable ? 'Change icon' : undefined}
      onClick={() => {
        const at = CALLOUT_EMOJIS.indexOf(node.attrs.emoji);
        updateAttributes({
          emoji: CALLOUT_EMOJIS[(at + 1) % CALLOUT_EMOJIS.length],
        });
      }}
      className="doc-callout-icon"
    >
      {node.attrs.emoji || '💡'}
    </button>
    <NodeViewContent className="doc-callout-body" />
  </NodeViewWrapper>
);

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      emoji: {
        default: '💡',
        parseHTML: (el) => el.getAttribute('data-emoji') || '💡',
        renderHTML: (attrs) => ({ 'data-emoji': attrs.emoji }),
      },
    };
  },
  parseHTML: () => [{ tag: 'div[data-callout]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-callout': '' }),
    0,
  ],
  addNodeView: () => ReactNodeViewRenderer(CalloutView),
});

/* -------------------------------------------------------------------------- */
/*                                   Toggle                                   */
/* -------------------------------------------------------------------------- */

const ToggleView = ({ node, updateAttributes, editor }: NodeViewProps) => {
  // Readers fold and unfold for themselves; editors save it with the page.
  const [open, setOpen] = useState<boolean>(node.attrs.open !== false);
  useEffect(() => setOpen(node.attrs.open !== false), [node.attrs.open]);
  return (
    <NodeViewWrapper className="doc-toggle" data-open={String(open)}>
      <button
        type="button"
        contentEditable={false}
        aria-label={open ? 'Fold' : 'Unfold'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setOpen(!open);
          if (editor.isEditable) updateAttributes({ open: !open });
        }}
        className="doc-toggle-arrow"
      >
        <Icon name="arrow_right" />
      </button>
      <NodeViewContent className="doc-toggle-inner" />
    </NodeViewWrapper>
  );
};

export const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'toggleSummary toggleBody',
  defining: true,
  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute('data-open') !== 'false',
        renderHTML: (attrs) => ({ 'data-open': String(attrs.open) }),
      },
    };
  },
  parseHTML: () => [{ tag: 'div[data-toggle]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-toggle': '' }),
    0,
  ],
  addNodeView: () => ReactNodeViewRenderer(ToggleView),
});

export const ToggleSummary = Node.create({
  name: 'toggleSummary',
  content: 'inline*',
  defining: true,
  parseHTML: () => [{ tag: 'div[data-toggle-summary]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-toggle-summary': '' }),
    0,
  ],
  addKeyboardShortcuts() {
    return {
      // Enter on the title opens the toggle and starts a line inside it.
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== this.name) return false;
        const togglePos = $from.before(-1);
        const toggle = $from.node(-1);
        const bodyStart = $from.after() + 1;
        const { tr, schema } = editor.state;
        tr.setNodeMarkup(togglePos, undefined, { ...toggle.attrs, open: true });
        tr.insert(bodyStart, schema.nodes.paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, bodyStart + 1));
        editor.view.dispatch(tr.scrollIntoView());
        return true;
      },
      // Backspace at the start of the title turns the toggle back into text.
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (
          !empty ||
          $from.parent.type.name !== this.name ||
          $from.parentOffset !== 0
        )
          return false;
        const togglePos = $from.before(-1);
        const toggle = $from.node(-1);
        const { tr, schema } = editor.state;
        const blocks = [
          schema.nodes.paragraph.create(null, toggle.child(0).content),
        ];
        toggle.child(1).forEach((child) => {
          if (!(child.type.name === 'paragraph' && !child.content.size))
            blocks.push(child);
        });
        tr.replaceWith(togglePos, togglePos + toggle.nodeSize, blocks);
        tr.setSelection(TextSelection.create(tr.doc, togglePos + 1));
        editor.view.dispatch(tr);
        return true;
      },
    };
  },
});

export const ToggleBody = Node.create({
  name: 'toggleBody',
  content: 'block+',
  defining: true,
  parseHTML: () => [{ tag: 'div[data-toggle-body]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-toggle-body': '' }),
    0,
  ],
});

/** A toggle, with `text` as its title when there is some. */
export const toggleJSON = (title?: JSONContent[]): JSONContent => ({
  type: 'toggle',
  attrs: { open: true },
  content: [
    { type: 'toggleSummary', ...(title?.length && { content: title }) },
    { type: 'toggleBody', content: [{ type: 'paragraph' }] },
  ],
});

/* -------------------------------------------------------------------------- */
/*                                    Embed                                   */
/* -------------------------------------------------------------------------- */

const EmbedView = ({ node, selected }: NodeViewProps) => {
  const player = embedPlayer(node.attrs.src);
  const url = safeUrl(node.attrs.src);
  return (
    <NodeViewWrapper
      className={cn('doc-embed', selected && 'is-selected')}
      contentEditable={false}
      data-drag-handle
    >
      {player ? (
        <div
          className="doc-embed-frame"
          style={{ aspectRatio: String(player.aspect) }}
        >
          <iframe
            src={player.src}
            title={player.service}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-forms"
          />
        </div>
      ) : url ? (
        <a
          href={url.href}
          target="_blank"
          rel="noopener noreferrer"
          className="doc-bookmark"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[18px] text-neutral-400">
            <Icon name="language" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-neutral-100">
              {url.hostname.replace(/^www\./, '')}
            </span>
            <span className="block truncate text-xs text-neutral-500">
              {url.href}
            </span>
          </span>
        </a>
      ) : (
        <p className="doc-bookmark text-sm text-neutral-500">
          This link can’t be shown.
        </p>
      )}
    </NodeViewWrapper>
  );
};

export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-src'),
        renderHTML: (attrs) => ({ 'data-src': attrs.src }),
      },
    };
  },
  parseHTML: () => [{ tag: 'div[data-embed]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-embed': '' }),
  ],
  addNodeView: () => ReactNodeViewRenderer(EmbedView),
});

/* -------------------------------------------------------------------------- */
/*                                 Link to page                               */
/* -------------------------------------------------------------------------- */

const PageLinkView = ({ node, selected }: NodeViewProps) => {
  const links = useContext(DocLinksContext);
  const id = node.attrs.pageId as string;
  const live = links?.pages.find((p) => p.id === id);
  const gone = !!links && !live;
  const title = live?.title || node.attrs.title || 'Untitled';
  return (
    <NodeViewWrapper
      className={cn('doc-page-link', selected && 'is-selected')}
      contentEditable={false}
      data-drag-handle
    >
      <button
        type="button"
        disabled={!links || gone}
        onClick={() => links?.open(id)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors',
          !gone && links && 'hover:bg-white/[0.05]',
        )}
      >
        <span className="text-[1.1em] leading-none">
          {gone ? '🗑️' : live?.emoji || '📄'}
        </span>
        <span
          className={cn(
            'truncate font-medium underline decoration-white/20 underline-offset-4',
            gone ? 'text-neutral-500 line-through' : 'text-neutral-100',
          )}
        >
          {title}
        </span>
        {gone && <span className="text-xs text-neutral-600">Deleted</span>}
      </button>
    </NodeViewWrapper>
  );
};

export const PageLink = Node.create({
  name: 'pageLink',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-page-id'),
        renderHTML: (attrs) => ({ 'data-page-id': attrs.pageId }),
      },
      title: {
        default: '',
        parseHTML: (el) => el.textContent ?? '',
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML: () => [{ tag: 'div[data-page-link]' }],
  renderHTML: ({ node, HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-page-link': '' }),
    node.attrs.title || 'Untitled',
  ],
  addNodeView: () => ReactNodeViewRenderer(PageLinkView),
});

/* -------------------------------------------------------------------------- */
/*                              Table of contents                             */
/* -------------------------------------------------------------------------- */

type Heading = { level: number; text: string; pos: number };

const TocView = ({ editor, selected }: NodeViewProps) => {
  const read = () => {
    const out: Heading[] = [];
    editor.state.doc.descendants((n, pos) => {
      if (n.type.name === 'heading' && n.textContent.trim())
        out.push({ level: n.attrs.level, text: n.textContent, pos });
    });
    return out;
  };
  const [headings, setHeadings] = useState<Heading[]>(read);
  useEffect(() => {
    const update = () => setHeadings(read());
    editor.on('update', update);
    return () => {
      editor.off('update', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <NodeViewWrapper
      className={cn('doc-toc', selected && 'is-selected')}
      contentEditable={false}
      data-drag-handle
    >
      {headings.length ? (
        headings.map((h) => (
          <button
            key={`${h.pos}:${h.text}`}
            type="button"
            onClick={() => {
              const dom = editor.view.nodeDOM(h.pos);
              if (dom instanceof HTMLElement)
                dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{ paddingLeft: `${(h.level - 1) * 16 + 6}px` }}
            className="block w-full truncate rounded-md py-0.5 pr-2 text-left text-sm text-neutral-400 underline decoration-white/15 underline-offset-4 hover:bg-white/[0.04] hover:text-neutral-100"
          >
            {h.text}
          </button>
        ))
      ) : (
        <p className="px-1.5 text-sm text-neutral-600">
          Add headings to fill the table of contents.
        </p>
      )}
    </NodeViewWrapper>
  );
};

export const TableOfContents = Node.create({
  name: 'tableOfContents',
  group: 'block',
  atom: true,
  draggable: true,
  parseHTML: () => [{ tag: 'div[data-toc]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'div',
    mergeAttributes(HTMLAttributes, { 'data-toc': '' }),
  ],
  addNodeView: () => ReactNodeViewRenderer(TocView),
});

/* -------------------------------------------------------------------------- */
/*                               Trailing line                                */
/* -------------------------------------------------------------------------- */

/**
 * Keeps an empty line at the end of the page while it is being edited, so
 * there is always somewhere to write after a table, an embed or a page link.
 */
export const TrailingLine = Extension.create({
  name: 'trailingLine',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('trailingLine'),
        appendTransaction: (_trs, _old, state) => {
          if (!editor.isEditable) return null;
          const last = state.doc.lastChild;
          if (!last || last.type.name === 'paragraph') return null;
          return state.tr.insert(
            state.doc.content.size,
            state.schema.nodes.paragraph.create(),
          );
        },
      }),
    ];
  },
});
