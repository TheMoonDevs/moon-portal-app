'use client';

import type { ProjectPage } from '@db/client';
import type { JSONContent } from '@tiptap/react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Spin } from '../Admin/shared/AdminUI';
import { errorText } from '../Admin/Workspace/shared';
import { DocEditor } from './DocEditor';
import { ago } from './types';

const SAVE_AFTER_MS = 700;
const EMOJIS = ['🎯', '💡', '🚀', '✨', '🧭', '📈', '🎵', '🎬', '🛠️', '🌱'];

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Patch = Partial<Pick<ProjectPage, 'title' | 'emoji' | 'content'>>;

/**
 * Saves a page a moment after the last keystroke, and right away when the
 * page is left. `create` makes the page on the first edit when it does not
 * exist yet (the objective starts that way).
 */
const useAutosave = (
  projectId: string,
  page: ProjectPage | null,
  create: (patch: Patch) => Promise<ProjectPage>,
  onSaved: (page: ProjectPage) => void,
) => {
  const [state, setState] = useState<SaveState>('idle');
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pageRef = useRef(page);
  pageRef.current = page;
  const creating = useRef<Promise<ProjectPage> | null>(null);
  const handlers = useRef({ create, onSaved });
  handlers.current = { create, onSaved };

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    setState('saving');
    try {
      let current = pageRef.current;
      if (!current) {
        creating.current ??= handlers.current.create(patch);
        current = await creating.current;
        pageRef.current = current;
        handlers.current.onSaved(current);
        setState('saved');
        return;
      }
      const res = await PortalSdk.patchData(
        `/api/projects/${projectId}/pages/${current.id}`,
        patch,
      );
      handlers.current.onSaved(res?.data?.page ?? { ...current, ...patch });
      setState('saved');
    } catch (err) {
      // Keep the edit so the next save tries again.
      pending.current = { ...patch, ...pending.current };
      setState('error');
      toast.error(errorText(err, 'Could not save the page.'));
    }
  }, [projectId]);

  const queue = useCallback(
    (patch: Patch) => {
      pending.current = { ...pending.current, ...patch };
      setState('saving');
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_AFTER_MS);
    },
    [flush],
  );

  useEffect(
    () => () => {
      flush();
    },
    [flush],
  );

  return { state, queue };
};

export const SaveBadge = ({ state }: { state: SaveState }) => (
  <span className="flex items-center gap-1 text-xs text-neutral-500">
    {state === 'saving' ? (
      <>
        <Spin className="size-3" /> Saving
      </>
    ) : state === 'error' ? (
      <span className="text-rose-300">Not saved</span>
    ) : state === 'saved' ? (
      <>
        <Icon name="cloud_done" className="text-[15px]" /> Saved
      </>
    ) : null}
  </span>
);

/** A one-line-looking title that wraps and grows like a heading. */
const GrowingTitle = (
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} />;
};

/** A page of the project with a title, an emoji and a Notion-like body. */
export const PageDoc = ({
  projectId,
  page,
  kind,
  canEdit,
  titlePlaceholder,
  bodyPlaceholder,
  defaultEmoji,
  eyebrow,
  onSaved,
  onSaveState,
}: {
  projectId: string;
  page: ProjectPage | null;
  kind: 'OBJECTIVE' | 'IDEA';
  canEdit: boolean;
  titlePlaceholder: string;
  bodyPlaceholder?: string;
  defaultEmoji: string;
  eyebrow?: React.ReactNode;
  onSaved: (page: ProjectPage) => void;
  onSaveState?: (state: SaveState) => void;
}) => {
  const [title, setTitle] = useState(page?.title ?? '');
  const [emoji, setEmoji] = useState(page?.emoji || defaultEmoji);
  const [picking, setPicking] = useState(false);

  const create = useCallback(
    async (patch: Patch) => {
      const res = await PortalSdk.postData(`/api/projects/${projectId}/pages`, {
        kind,
        title: '',
        emoji: defaultEmoji,
        ...patch,
      });
      return res?.data?.page as ProjectPage;
    },
    [projectId, kind, defaultEmoji],
  );
  const { state, queue } = useAutosave(projectId, page, create, onSaved);

  useEffect(() => onSaveState?.(state), [state, onSaveState]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mx-auto w-full max-w-3xl px-6 pt-10 md:px-12 md:pt-16"
    >
      <div className="relative mb-3">
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setPicking((v) => !v)}
          className="rounded-xl p-1 text-5xl leading-none transition-colors enabled:hover:bg-white/[0.06]"
          aria-label="Change icon"
        >
          {emoji}
        </button>
        {picking && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 top-full z-20 mt-1 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-neutral-900 p-2 shadow-2xl"
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setEmoji(e);
                  setPicking(false);
                  queue({ emoji: e });
                }}
                className="flex size-9 items-center justify-center rounded-lg text-xl hover:bg-white/[0.08]"
              >
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {eyebrow}

      <GrowingTitle
        value={title}
        readOnly={!canEdit}
        onChange={(e) => {
          const next = e.target.value.replace(/\n/g, ' ');
          setTitle(next);
          queue({ title: next });
        }}
        placeholder={titlePlaceholder}
        className="w-full resize-none bg-transparent text-3xl font-bold leading-tight tracking-tight text-white outline-none placeholder:text-neutral-700 md:text-4xl"
      />

      {page?.updatedAt && (
        <p className="mb-6 mt-2 text-xs text-neutral-500">
          Edited {ago(page.updatedAt)}
        </p>
      )}
      {!page?.updatedAt && <div className="mb-6" />}

      <DocEditor
        content={(page?.content as JSONContent) ?? null}
        editable={canEdit}
        placeholder={bodyPlaceholder}
        onChange={(content) => queue({ content })}
      />
    </motion.article>
  );
};
