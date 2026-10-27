'use client';

import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Underline from '@tiptap/extension-underline';
import {
  BubbleMenu,
  type Editor,
  EditorContent,
  type JSONContent,
  useEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from '../Admin/shared/AdminUI';

/* -------------------------------------------------------------------------- */
/*                                Slash commands                              */
/* -------------------------------------------------------------------------- */

type Command = {
  key: string;
  label: string;
  hint: string;
  icon: string;
  run: (editor: Editor) => void;
};

const COMMANDS: Command[] = [
  {
    key: 'text',
    label: 'Text',
    hint: 'Plain writing',
    icon: 'notes',
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    key: 'h1',
    label: 'Heading 1',
    hint: 'Big section title',
    icon: 'format_h1',
    run: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    key: 'h2',
    label: 'Heading 2',
    hint: 'Medium section title',
    icon: 'format_h2',
    run: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    key: 'h3',
    label: 'Heading 3',
    hint: 'Small section title',
    icon: 'format_h3',
    run: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    key: 'todo',
    label: 'To-do list',
    hint: 'Track things with checkboxes',
    icon: 'check_box',
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    key: 'bullet',
    label: 'Bulleted list',
    hint: 'A simple list',
    icon: 'format_list_bulleted',
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    key: 'numbered',
    label: 'Numbered list',
    hint: 'A list in order',
    icon: 'format_list_numbered',
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    key: 'quote',
    label: 'Quote',
    hint: 'Call out a line',
    icon: 'format_quote',
    run: (e) => e.chain().focus().setBlockquote().run(),
  },
  {
    key: 'code',
    label: 'Code',
    hint: 'A block of code',
    icon: 'code_blocks',
    run: (e) => e.chain().focus().setCodeBlock().run(),
  },
  {
    key: 'divider',
    label: 'Divider',
    hint: 'Split sections',
    icon: 'horizontal_rule',
    run: (e) => e.chain().focus().setHorizontalRule().run(),
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

const matching = (query: string) =>
  COMMANDS.filter(
    (c) =>
      !query ||
      c.label.toLowerCase().includes(query) ||
      c.key.includes(query.replace(/\s/g, '')),
  );

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

/* -------------------------------------------------------------------------- */
/*                                   Editor                                   */
/* -------------------------------------------------------------------------- */

/**
 * A Notion-like page: write freely, `/` for blocks, select text to format.
 * `onChange` gets the document as Tiptap JSON on every edit.
 */
export const DocEditor = ({
  content,
  editable,
  placeholder = 'Write something, or press / for blocks…',
  onChange,
  className,
}: {
  content: JSONContent | null | undefined;
  editable: boolean;
  placeholder?: string;
  onChange: (doc: JSONContent) => void;
  className?: string;
}) => {
  const [slash, setSlash] = useState<Slash | null>(null);
  const [active, setActive] = useState(0);
  // Keyboard handling runs inside the editor, outside React's render.
  const slashRef = useRef<{ slash: Slash | null; active: number }>({
    slash: null,
    active: 0,
  });
  slashRef.current = { slash, active };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editorRef = useRef<Editor | null>(null);
  const lastDoc = useRef<string | null>(null);

  const runCommand = (editor: Editor, command: Command) => {
    const current = slashRef.current.slash;
    if (current)
      editor
        .chain()
        .focus()
        .deleteRange({ from: current.from, to: current.to })
        .run();
    command.run(editor);
    setSlash(null);
  };

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
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'heading' ? 'Heading' : placeholder,
      }),
    ],
    editorProps: {
      attributes: { class: 'project-doc min-h-[50vh] pb-[30vh]' },
      handleKeyDown: (_view, event) => {
        const { slash: open, active: index } = slashRef.current;
        if (!open) return false;
        const list = matching(open.query);
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
      lastDoc.current = JSON.stringify(editor.getJSON());
    },
    onUpdate: ({ editor }) => {
      // Normalising the loaded page is not an edit; only real changes save.
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
    const close = () => setSlash(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [slash]);

  const list = slash ? matching(slash.query) : [];

  return (
    <div className={cn('relative', className)}>
      {editor && editable && <FormatBar editor={editor} />}
      <EditorContent editor={editor} />

      <AnimatePresence>
        {editor && slash && list.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'fixed',
              left: Math.min(slash.x, window.innerWidth - 280),
              top: Math.min(slash.y + 6, window.innerHeight - 340),
            }}
            className="z-50 max-h-80 w-64 overflow-y-auto rounded-xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl shadow-black/50 backdrop-blur"
          >
            <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Blocks
            </p>
            {list.map((command, i) => (
              <button
                key={command.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => runCommand(editor, command)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left',
                  i === active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]',
                )}
              >
                <span className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[18px] text-neutral-300">
                  <Icon name={command.icon} />
                </span>
                <span>
                  <span className="block text-sm text-neutral-100">
                    {command.label}
                  </span>
                  <span className="block text-[11px] text-neutral-500">
                    {command.hint}
                  </span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
