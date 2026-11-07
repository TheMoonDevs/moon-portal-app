'use client';

import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Underline from '@tiptap/extension-underline';
import { TextSelection } from '@tiptap/pm/state';
import {
  BubbleMenu,
  type Editor,
  EditorContent,
  type JSONContent,
  useEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { docToMarkdown, markdownToDoc } from '@/lib/workspace/pageMarkdown';
import { uploadImage } from '@/utils/helpers/uploads';

import { Icon, Spin } from '../Admin/shared/AdminUI';
import {
  Callout,
  type DocLinks,
  DocLinksContext,
  Embed,
  PageLink,
  type PageTarget,
  TableOfContents,
  Toggle,
  ToggleBody,
  toggleJSON,
  ToggleSummary,
  TrailingLine,
} from './editor/blocks';
import { normaliseUrl } from './editor/embeds';
import {
  isMarkdownPaste,
  markdownContent,
  MarkdownShortcuts,
  sliceToMarkdown,
} from './editor/markdown';

export type { DocLinks, PageTarget } from './editor/blocks';

/* -------------------------------------------------------------------------- */
/*                                Slash commands                              */
/* -------------------------------------------------------------------------- */

/** What a command can ask the editor for besides changing the document. */
type Tools = {
  ask: (kind: Asking['kind']) => void;
  newPage: () => void;
  /** Switches to writing the page as Markdown. */
  markdown: () => void;
};

type Command = {
  key: string;
  label: string;
  hint: string;
  icon: string;
  group: 'Basic blocks' | 'Pages' | 'Media' | 'Advanced';
  /** More words it is found by. */
  also?: string;
  /** The Markdown that makes it while typing, shown in the menu. */
  md?: string;
  /** Only shown when the document can link to pages. */
  pages?: 'link' | 'create';
  run: (editor: Editor, tools: Tools) => void;
};

/**
 * Swaps the empty or plain line the cursor is on for `node`, keeping the
 * line's text where `node` puts it, with the cursor at its end. Inside lists
 * and other blocks it is added after the line instead.
 */
const replaceLine = (
  editor: Editor,
  build: (text: JSONContent[] | undefined) => JSONContent,
  /** Where the line's text lands, counted from the start of `node`. */
  textOffset: number,
) => {
  const { $from } = editor.state.selection;
  const line = $from.parent;
  const text = line.toJSON().content as JSONContent[] | undefined;
  if ($from.depth !== 1 || line.type.name !== 'paragraph') {
    editor.chain().focus().insertContent(build(undefined)).run();
    return;
  }
  const from = $from.before();
  editor
    .chain()
    .focus()
    .insertContentAt({ from, to: from + line.nodeSize }, build(text))
    .setTextSelection(from + textOffset + line.content.size)
    .run();
};

const COMMANDS: Command[] = [
  {
    key: 'text',
    label: 'Text',
    hint: 'Plain writing',
    icon: 'notes',
    group: 'Basic blocks',
    also: 'paragraph',
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    key: 'h1',
    md: '#',
    label: 'Heading 1',
    hint: 'Big section title',
    icon: 'format_h1',
    group: 'Basic blocks',
    also: 'title',
    run: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    key: 'h2',
    md: '##',
    label: 'Heading 2',
    hint: 'Medium section title',
    icon: 'format_h2',
    group: 'Basic blocks',
    run: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    key: 'h3',
    md: '###',
    label: 'Heading 3',
    hint: 'Small section title',
    icon: 'format_h3',
    group: 'Basic blocks',
    run: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    key: 'todo',
    md: '[]',
    label: 'To-do list',
    hint: 'Track things with checkboxes',
    icon: 'check_box',
    group: 'Basic blocks',
    also: 'checkbox task',
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    key: 'bullet',
    md: '-',
    label: 'Bulleted list',
    hint: 'A simple list',
    icon: 'format_list_bulleted',
    group: 'Basic blocks',
    also: 'unordered',
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    key: 'numbered',
    md: '1.',
    label: 'Numbered list',
    hint: 'A list in order',
    icon: 'format_list_numbered',
    group: 'Basic blocks',
    also: 'ordered',
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    key: 'toggle',
    label: 'Toggle list',
    hint: 'Hide things inside, open when needed',
    icon: 'arrow_right',
    group: 'Basic blocks',
    also: 'collapse fold details',
    run: (e) => replaceLine(e, (text) => toggleJSON(text), 2),
  },
  {
    key: 'quote',
    md: '>',
    label: 'Quote',
    hint: 'Call out a line',
    icon: 'format_quote',
    group: 'Basic blocks',
    also: 'blockquote',
    run: (e) => e.chain().focus().setBlockquote().run(),
  },
  {
    key: 'callout',
    label: 'Callout',
    hint: 'Make a note stand out',
    icon: 'lightbulb',
    group: 'Basic blocks',
    also: 'note tip warning info',
    run: (e) =>
      replaceLine(
        e,
        (text) => ({
          type: 'callout',
          attrs: { emoji: '💡' },
          content: [{ type: 'paragraph', ...(text && { content: text }) }],
        }),
        2,
      ),
  },
  {
    key: 'divider',
    md: '---',
    label: 'Divider',
    hint: 'Split sections',
    icon: 'horizontal_rule',
    group: 'Basic blocks',
    also: 'line separator hr',
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    key: 'page',
    label: 'Page',
    hint: 'A new page inside this one',
    icon: 'note_add',
    group: 'Pages',
    also: 'subpage new doc',
    pages: 'create',
    run: (_e, tools) => tools.newPage(),
  },
  {
    key: 'linkpage',
    label: 'Link to page',
    hint: 'Point to another page here',
    icon: 'link',
    group: 'Pages',
    also: 'mention reference',
    pages: 'link',
    run: (_e, tools) => tools.ask('page'),
  },
  {
    key: 'image',
    label: 'Image',
    hint: 'Upload or paste a link',
    icon: 'image',
    group: 'Media',
    also: 'picture photo',
    run: (_e, tools) => tools.ask('image'),
  },
  {
    key: 'video',
    label: 'Video',
    hint: 'YouTube, Loom, Vimeo…',
    icon: 'smart_display',
    group: 'Media',
    also: 'youtube loom vimeo',
    run: (_e, tools) => tools.ask('embed'),
  },
  {
    key: 'embed',
    label: 'Embed',
    hint: 'Figma, Google Docs, Spotify, Miro…',
    icon: 'web',
    group: 'Media',
    also: 'iframe figma google drive spotify miro codepen',
    run: (_e, tools) => tools.ask('embed'),
  },
  {
    key: 'bookmark',
    label: 'Web bookmark',
    hint: 'A link as a card',
    icon: 'bookmark',
    group: 'Media',
    also: 'url website',
    run: (_e, tools) => tools.ask('embed'),
  },
  {
    key: 'table',
    label: 'Table',
    hint: 'Rows and columns',
    icon: 'table',
    group: 'Advanced',
    also: 'grid',
    run: (e) =>
      e
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    key: 'code',
    md: '```',
    label: 'Code',
    hint: 'A block of code',
    icon: 'code_blocks',
    group: 'Advanced',
    also: 'snippet',
    run: (e) => e.chain().focus().setCodeBlock().run(),
  },
  {
    key: 'toc',
    label: 'Table of contents',
    hint: 'Jump to the headings',
    icon: 'toc',
    group: 'Advanced',
    also: 'outline contents',
    run: (e) =>
      e.chain().focus().insertContent({ type: 'tableOfContents' }).run(),
  },
  {
    key: 'markdown',
    label: 'Edit as Markdown',
    hint: 'Write or paste the whole page as Markdown',
    icon: 'edit_note',
    group: 'Advanced',
    also: 'md source raw import',
    run: (_e, tools) => tools.markdown(),
  },
  {
    key: 'date',
    label: 'Today’s date',
    hint: 'Writes the date',
    icon: 'calendar_today',
    group: 'Advanced',
    also: 'now day',
    run: (e) =>
      e
        .chain()
        .focus()
        .insertContent(
          `${new Date().toLocaleDateString(undefined, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })} `,
        )
        .run(),
  },
];

type Slash = { from: number; to: number; query: string; x: number; y: number };

/** The `/query` right before the cursor, if the person is typing one. */
const readSlash = (editor: Editor): Slash | null => {
  const { selection } = editor.state;
  if (!selection.empty) return null;
  const { $from } = selection;
  if ($from.parent.type.name === 'codeBlock') return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, '\n', ' ');
  const match = /(?:^|\s)\/([a-z0-9 ]{0,20})$/i.exec(before);
  if (!match) return null;
  const length = match[1].length + 1;
  const coords = editor.view.coordsAtPos($from.pos);
  return {
    from: $from.pos - length,
    to: $from.pos,
    query: match[1].toLowerCase(),
    x: coords.left,
    y: coords.bottom,
  };
};

const matching = (query: string, links: DocLinks | undefined) =>
  COMMANDS.filter(
    (c) =>
      (!c.pages || (c.pages === 'create' ? links?.create : links)) &&
      (!query ||
        c.label.toLowerCase().includes(query) ||
        c.key.includes(query.replace(/\s/g, '')) ||
        c.also?.split(' ').some((w) => w.startsWith(query.trim()))),
  );

/** A link, image or page being picked for a command. */
type Asking = { kind: 'image' | 'embed' | 'page'; x: number; y: number };

/* -------------------------------------------------------------------------- */
/*                                 Bubble menu                                */
/* -------------------------------------------------------------------------- */

const MarkButton = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={cn(
      'flex size-8 items-center justify-center rounded-md text-[18px] transition-colors',
      active
        ? 'bg-white/[0.12] text-white'
        : 'text-neutral-400 hover:bg-white/[0.07] hover:text-white',
    )}
  >
    <Icon name={icon} />
  </button>
);

const FormatBar = ({ editor }: { editor: Editor }) => {
  const [linking, setLinking] = useState(false);
  const [href, setHref] = useState('');

  const applyLink = () => {
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!url) chain.unsetLink().run();
    else
      chain
        .setLink({ href: /^https?:\/\//i.test(url) ? url : `https://${url}` })
        .run();
    setLinking(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="formatBar"
      shouldShow={({ state }) =>
        !state.selection.empty &&
        state.selection instanceof TextSelection &&
        !editor.isActive('codeBlock')
      }
      tippyOptions={{ duration: 120, onHidden: () => setLinking(false) }}
      className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl shadow-black/50 backdrop-blur"
    >
      {linking ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyLink();
          }}
          className="flex items-center gap-1"
        >
          <input
            autoFocus
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setLinking(false)}
            placeholder="Paste a link"
            className="h-8 w-56 rounded-md bg-white/[0.06] px-2 text-sm text-white outline-none placeholder:text-neutral-500"
          />
          <MarkButton icon="check" label="Save link" onClick={applyLink} />
        </form>
      ) : (
        <>
          <MarkButton
            icon="format_bold"
            label="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <MarkButton
            icon="format_italic"
            label="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <MarkButton
            icon="format_underlined"
            label="Underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <MarkButton
            icon="strikethrough_s"
            label="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <MarkButton
            icon="code"
            label="Inline code"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          />
          <MarkButton
            icon="ink_highlighter"
            label="Highlight"
            active={editor.isActive('highlight')}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          />
          <span className="mx-0.5 h-5 w-px bg-white/10" />
          <MarkButton
            icon="link"
            label="Link"
            active={editor.isActive('link')}
            onClick={() => {
              setHref(editor.getAttributes('link').href ?? '');
              setLinking(true);
            }}
          />
          <MarkButton
            icon="format_h2"
            label="Heading"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          />
          <MarkButton
            icon="check_box"
            label="To-do"
            active={editor.isActive('taskList')}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          />
        </>
      )}
    </BubbleMenu>
  );
};

/** Row and column tools while the cursor is in a table. */
const TableBar = ({ editor }: { editor: Editor }) => (
  <BubbleMenu
    editor={editor}
    pluginKey="tableBar"
    shouldShow={({ state }) =>
      state.selection.empty && editor.isEditable && editor.isActive('table')
    }
    tippyOptions={{ duration: 120, placement: 'top-start' }}
    className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl shadow-black/50 backdrop-blur"
  >
    <MarkButton
      icon="add_row_below"
      label="Add a row below"
      onClick={() => editor.chain().focus().addRowAfter().run()}
    />
    <MarkButton
      icon="add_column_right"
      label="Add a column to the right"
      onClick={() => editor.chain().focus().addColumnAfter().run()}
    />
    <MarkButton
      icon="table_rows"
      label="Header row on or off"
      active={editor.isActive('tableHeader')}
      onClick={() => editor.chain().focus().toggleHeaderRow().run()}
    />
    <span className="mx-0.5 h-5 w-px bg-white/10" />
    <MarkButton
      icon="variable_remove"
      label="Delete this row"
      onClick={() => editor.chain().focus().deleteRow().run()}
    />
    <MarkButton
      icon="view_column"
      label="Delete this column"
      onClick={() => editor.chain().focus().deleteColumn().run()}
    />
    <MarkButton
      icon="delete"
      label="Delete the table"
      onClick={() => editor.chain().focus().deleteTable().run()}
    />
  </BubbleMenu>
);

/** Asks for an image, a link to embed, or a page to link to. */
const AskBox = ({
  asking,
  links,
  onImage,
  onEmbed,
  onPage,
  onClose,
}: {
  asking: Asking;
  links?: DocLinks;
  onImage: (src: string) => void;
  onEmbed: (src: string) => void;
  onPage: (page: PageTarget) => void;
  onClose: () => void;
}) => {
  const [value, setValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [active, setActive] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [onClose]);

  const pages = useMemo(() => {
    if (asking.kind !== 'page') return [];
    const q = value.trim().toLowerCase();
    return (links?.pages ?? [])
      .filter((p) => p.id !== links?.currentId)
      .filter((p) => !q || (p.title || 'Untitled').toLowerCase().includes(q))
      .slice(0, 8);
  }, [asking.kind, value, links]);

  const submit = () => {
    if (asking.kind === 'page') {
      const page = pages[Math.min(active, pages.length - 1)];
      if (page) onPage(page);
      return;
    }
    const url = normaliseUrl(value);
    if (!url) {
      toast.error('Paste a web link.');
      return;
    }
    if (asking.kind === 'image') onImage(url);
    else onEmbed(url);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      onImage(await uploadImage(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      ref={boxRef}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'fixed',
        left: Math.max(8, Math.min(asking.x, window.innerWidth - 336)),
        top: Math.min(asking.y + 6, window.innerHeight - 320),
      }}
      className="z-50 w-80 rounded-xl border border-white/10 bg-neutral-900/95 p-2 shadow-2xl shadow-black/50 backdrop-blur"
    >
      {asking.kind === 'image' && (
        <>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-3 text-sm text-neutral-300 hover:border-white/30 hover:text-white"
          >
            {uploading ? (
              <Spin className="size-4" />
            ) : (
              <Icon name="upload" className="text-[18px]" />
            )}
            {uploading ? 'Uploading…' : 'Upload an image'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-1"
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (asking.kind !== 'page' || !pages.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => (i + 1) % pages.length);
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => (i - 1 + pages.length) % pages.length);
            }
          }}
          placeholder={
            asking.kind === 'page'
              ? 'Search pages'
              : asking.kind === 'image'
                ? 'Or paste an image link'
                : 'Paste a link: YouTube, Loom, Figma, Google Docs…'
          }
          className="h-9 min-w-0 flex-1 rounded-lg bg-white/[0.06] px-2.5 text-sm text-white outline-none placeholder:text-neutral-500"
        />
        {asking.kind !== 'page' && (
          <button
            type="submit"
            className="h-9 rounded-lg bg-white px-3 text-sm font-medium text-neutral-900"
          >
            {asking.kind === 'image' ? 'Add' : 'Embed'}
          </button>
        )}
      </form>
      {asking.kind === 'page' && (
        <div className="mt-1 max-h-60 overflow-y-auto">
          {pages.map((page, i) => (
            <button
              key={page.id}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => onPage(page)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-200',
                i === active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]',
              )}
            >
              <span>{page.emoji || '📄'}</span>
              <span className="truncate">{page.title || 'Untitled'}</span>
            </button>
          ))}
          {!pages.length && (
            <p className="px-2 py-3 text-center text-xs text-neutral-500">
              No pages match.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

/** A small button above the page, e.g. Copy as Markdown. */
const DocTool = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    title={label}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={cn(
      'flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] transition-colors',
      active
        ? 'bg-white/[0.1] text-white'
        : 'text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-200',
    )}
  >
    <Icon name={icon} className="text-[15px]" />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

/** The page written as Markdown; Esc or Done goes back to the page. */
const MarkdownBox = ({
  value,
  compact,
  onChange,
  onDone,
}: {
  value: string;
  compact: boolean;
  onChange: (value: string) => void;
  onDone: () => void;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <textarea
        ref={ref}
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onDone();
          }
        }}
        placeholder={
          '# A heading\n\nWrite in **Markdown**: - lists, [ ] to-dos, > quotes, ``` code…'
        }
        className={cn(
          'block w-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-6 text-neutral-200 outline-none placeholder:text-neutral-600',
          compact ? 'min-h-[96px]' : 'min-h-[50vh]',
        )}
      />
      <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-1.5 text-[11px] text-neutral-500">
        <span>Markdown · saves as you type · Esc to go back</span>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-2 py-0.5 text-neutral-300 hover:bg-white/[0.06] hover:text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   Editor                                   */
/* -------------------------------------------------------------------------- */

/** Classes for the writing area: a full page, or a short field in a form. */
const VARIANTS = {
  page: 'project-doc min-h-[50vh] pb-[30vh]',
  compact: 'project-doc project-doc-compact min-h-[72px]',
};

/**
 * A Notion-like page: write freely, `/` for blocks, select text to format.
 * `onChange` gets the document as Tiptap JSON on every edit. With `links`,
 * the page can link to other pages and make new pages inside it.
 */
export const DocEditor = ({
  content,
  editable,
  placeholder = 'Write something, or press / for blocks…',
  onChange,
  className,
  links,
  variant = 'page',
}: {
  content: JSONContent | null | undefined;
  editable: boolean;
  placeholder?: string;
  onChange: (doc: JSONContent) => void;
  className?: string;
  links?: DocLinks;
  variant?: keyof typeof VARIANTS;
}) => {
  const [slash, setSlash] = useState<Slash | null>(null);
  const [active, setActive] = useState(0);
  const [asking, setAsking] = useState<Asking | null>(null);
  /** The page as Markdown while it is being written that way. */
  const [markdown, setMarkdown] = useState<string | null>(null);
  const markdownTimer = useRef<ReturnType<typeof setTimeout>>();
  // Keyboard handling runs inside the editor, outside React's render.
  const slashRef = useRef<{ slash: Slash | null; active: number }>({
    slash: null,
    active: 0,
  });
  slashRef.current = { slash, active };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const linksRef = useRef(links);
  linksRef.current = links;
  const menuRef = useRef<HTMLDivElement>(null);

  const editorRef = useRef<Editor | null>(null);
  const lastDoc = useRef<string | null>(null);

  const insertPageLink = (editor: Editor, page: PageTarget) =>
    editor
      .chain()
      .focus()
      .insertContent([
        { type: 'pageLink', attrs: { pageId: page.id, title: page.title } },
        { type: 'paragraph' },
      ])
      .run();

  /** Makes a page inside this one, links it here, and opens it. */
  const newPage = async (editor: Editor) => {
    const make = linksRef.current?.create;
    if (!make) return;
    const page = await make();
    if (!page) return;
    insertPageLink(editor, page);
    linksRef.current?.open(page.id);
  };

  const openMarkdown = (editor: Editor) => {
    setSlash(null);
    setMarkdown(docToMarkdown(editor.getJSON()));
  };

  /** Puts the Markdown being written into the page, which saves it. */
  const applyMarkdown = (text: string) => {
    clearTimeout(markdownTimer.current);
    const editor = editorRef.current;
    if (!editor) return;
    const next = markdownToDoc(text) as JSONContent;
    if (
      JSON.stringify(next) ===
      JSON.stringify(markdownToDoc(docToMarkdown(editor.getJSON())))
    )
      return;
    editor.commands.setContent(next, true);
  };

  const closeMarkdown = () => {
    if (markdown !== null) applyMarkdown(markdown);
    setMarkdown(null);
    setTimeout(() => editorRef.current?.commands.focus('end'));
  };

  const copyMarkdown = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      await navigator.clipboard.writeText(docToMarkdown(editor.getJSON()));
      toast.success('Copied as Markdown.');
    } catch {
      toast.error('Could not copy.');
    }
  };

  const runCommand = (editor: Editor, command: Command) => {
    const current = slashRef.current.slash;
    if (current)
      editor
        .chain()
        .focus()
        .deleteRange({ from: current.from, to: current.to })
        .run();
    command.run(editor, {
      ask: (kind) =>
        setAsking({ kind, x: current?.x ?? 0, y: current?.y ?? 0 }),
      newPage: () => newPage(editor),
      markdown: () => openMarkdown(editor),
    });
    setSlash(null);
  };

  /** Uploads pasted or dropped images and puts them at `pos`. */
  const dropImages = (files: File[], pos?: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    files.forEach(async (file) => {
      const id = toast.loading('Uploading image…');
      try {
        const src = await uploadImage(file);
        const chain = editor.chain().focus();
        (pos === undefined
          ? chain.setImage({ src })
          : chain.insertContentAt(pos, { type: 'image', attrs: { src } })
        ).run();
        toast.dismiss(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed.', {
          id,
        });
      }
    });
  };

  const imagesIn = (list?: FileList | null) =>
    Array.from(list ?? []).filter((f) => f.type.startsWith('image/'));

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    content: content ?? '',
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: !editable,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ HTMLAttributes: { class: 'doc-image' } }),
      MarkdownShortcuts,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      Toggle,
      ToggleSummary,
      ToggleBody,
      Embed,
      PageLink,
      TableOfContents,
      TrailingLine,
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node, pos, editor: e }) => {
          if (node.type.name === 'toggleSummary') return 'Toggle';
          if (node.type.name === 'heading')
            return `Heading ${node.attrs.level ?? ''}`.trim();
          if (!node.isTextblock) return '';
          // Lines inside lists, toggles and callouts get a short hint.
          return e.state.doc.resolve(pos).depth > 0
            ? 'Type / for blocks'
            : placeholder;
        },
      }),
    ],
    editorProps: {
      attributes: { class: VARIANTS[variant] },
      handlePaste: (view, event) => {
        const editor = editorRef.current;
        if (!editor?.isEditable) return false;
        const files = imagesIn(event.clipboardData?.files);
        if (files.length) {
          dropImages(files);
          return true;
        }
        // Markdown pasted as plain text (notes, a README, a chat answer)
        // turns into blocks, unless it goes into a code block.
        const text = event.clipboardData?.getData('text/plain') ?? '';
        const html = event.clipboardData?.getData('text/html') ?? '';
        if (
          view.state.selection.$from.parent.type.spec.code ||
          !isMarkdownPaste(text, html)
        )
          return false;
        editor.chain().focus().insertContent(markdownContent(text)).run();
        return true;
      },
      // Copying puts Markdown on the clipboard for anything that takes text.
      clipboardTextSerializer: (slice) => sliceToMarkdown(slice),
      handleDrop: (view, event, _slice, moved) => {
        const files = imagesIn(event.dataTransfer?.files);
        if (moved || !files.length || !editorRef.current?.isEditable)
          return false;
        const at = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        dropImages(files, at?.pos);
        return true;
      },
      handleKeyDown: (_view, event) => {
        const { slash: open, active: index } = slashRef.current;
        if (!open) return false;
        const list = matching(open.query, linksRef.current);
        if (event.key === 'Escape') {
          setSlash(null);
          return true;
        }
        if (!list.length) return false;
        if (event.key === 'ArrowDown') {
          setActive((index + 1) % list.length);
          return true;
        }
        if (event.key === 'ArrowUp') {
          setActive((index - 1 + list.length) % list.length);
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          const command = list[Math.min(index, list.length - 1)];
          if (editorRef.current) runCommand(editorRef.current, command);
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor }) => {
      // Let the editor tidy the loaded page (such as the empty last line)
      // before it counts as the saved version.
      if (editor.isEditable) editor.view.dispatch(editor.state.tr);
      lastDoc.current = JSON.stringify(editor.getJSON());
    },
    onUpdate: ({ editor }) => {
      // Normalising the loaded page is not an edit; only real changes save.
      if (lastDoc.current === null) return;
      const doc = editor.getJSON();
      const json = JSON.stringify(doc);
      if (json !== lastDoc.current) {
        lastDoc.current = json;
        onChangeRef.current(doc);
      }
      const next = readSlash(editor);
      setSlash(next);
      if (next?.query !== slashRef.current.slash?.query) setActive(0);
    },
    onSelectionUpdate: ({ editor }) => {
      if (slashRef.current.slash) setSlash(readSlash(editor));
    },
    onBlur: () => setTimeout(() => setSlash(null), 120),
  });
  editorRef.current = editor;

  useEffect(() => {
    // No update event: making a page editable is not an edit.
    if (editor && editor.isEditable !== editable)
      editor.setEditable(editable, false);
  }, [editor, editable]);

  // The menu sits at the cursor; scrolling away closes it.
  useEffect(() => {
    if (!slash) return;
    const close = (e: Event) => {
      if (!menuRef.current?.contains(e.target as globalThis.Node))
        setSlash(null);
    };
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [slash]);

  // Keep the picked command in view as the arrows move through the menu.
  useEffect(() => {
    menuRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, slash]);

  const list = slash ? matching(slash.query, links) : [];

  const closeAsk = () => {
    setAsking(null);
    editor?.commands.focus();
  };

  return (
    <DocLinksContext.Provider value={links ?? null}>
      <div className={cn('group/doc relative', className)}>
        {editor && (
          <div
            className={cn(
              'absolute -top-7 right-0 z-10 flex items-center gap-0.5 transition-opacity',
              markdown === null &&
                'opacity-0 focus-within:opacity-100 group-hover/doc:opacity-100',
            )}
          >
            <DocTool
              icon="content_copy"
              label="Copy as Markdown"
              onClick={copyMarkdown}
            />
            {editable && (
              <DocTool
                icon={markdown === null ? 'edit_note' : 'article'}
                label={
                  markdown === null ? 'Edit as Markdown' : 'Back to the page'
                }
                active={markdown !== null}
                onClick={() =>
                  markdown === null ? openMarkdown(editor) : closeMarkdown()
                }
              />
            )}
          </div>
        )}
        {/* Kept mounted: their menus live outside this box. */}
        {editor && editable && <FormatBar editor={editor} />}
        {editor && editable && <TableBar editor={editor} />}
        <div className={cn(markdown !== null && 'hidden')}>
          <EditorContent editor={editor} />
        </div>
        {markdown !== null && (
          <MarkdownBox
            value={markdown}
            compact={variant === 'compact'}
            onChange={(text) => {
              setMarkdown(text);
              clearTimeout(markdownTimer.current);
              markdownTimer.current = setTimeout(
                () => applyMarkdown(text),
                400,
              );
            }}
            onDone={closeMarkdown}
          />
        )}

        <AnimatePresence>
          {editor && slash && list.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'fixed',
                left: Math.max(8, Math.min(slash.x, window.innerWidth - 296)),
                top: Math.min(slash.y + 6, window.innerHeight - 360),
              }}
              className="z-50 w-72 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 shadow-2xl shadow-black/50 backdrop-blur"
            >
              <div ref={menuRef} className="max-h-[340px] overflow-y-auto p-1">
                {list.map((command, i) => (
                  <div key={command.key}>
                    {command.group !== list[i - 1]?.group && (
                      <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        {command.group}
                      </p>
                    )}
                    <button
                      type="button"
                      data-index={i}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => runCommand(editor, command)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left',
                        i === active
                          ? 'bg-white/[0.08]'
                          : 'hover:bg-white/[0.04]',
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[18px] text-neutral-300">
                        <Icon name={command.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-neutral-100">
                          {command.label}
                        </span>
                        <span className="block truncate text-[11px] text-neutral-500">
                          {command.hint}
                        </span>
                      </span>
                      {command.md && (
                        <kbd className="shrink-0 font-mono text-[11px] text-neutral-600">
                          {command.md}
                        </kbd>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {editor && asking && (
          <AskBox
            asking={asking}
            links={links}
            onClose={closeAsk}
            onImage={(src) => {
              setAsking(null);
              editor.chain().focus().setImage({ src }).run();
            }}
            onEmbed={(src) => {
              setAsking(null);
              editor
                .chain()
                .focus()
                .insertContent({ type: 'embed', attrs: { src } })
                .run();
            }}
            onPage={(page) => {
              setAsking(null);
              insertPageLink(editor, page);
            }}
          />
        )}
      </div>
    </DocLinksContext.Provider>
  );
};
