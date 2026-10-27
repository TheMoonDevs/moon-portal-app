'use client';

import type { ProjectPage } from '@db/client';
import { motion } from 'framer-motion';

import { AdminButton, Icon, Spin } from '../../Admin/shared/AdminUI';
import { ago, docText, ideaTitle } from '../types';
import { SectionShell } from './SectionShell';

/** Every idea draft of the project as cards; open one to write in it. */
export const IdeasGallery = ({
  ideas,
  canEdit,
  creating,
  onOpen,
  onCreate,
}: {
  ideas: ProjectPage[];
  canEdit: boolean;
  creating: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) => (
  <SectionShell
    icon="lightbulb"
    title="Ideas"
    description="Rough drafts, half-thoughts and wild bets. Write as many as you like; the good ones become plans and tasks."
    actions={
      canEdit && (
        <AdminButton
          tone="primary"
          size="sm"
          icon="add"
          loading={creating}
          onClick={onCreate}
        >
          New idea
        </AdminButton>
      )
    }
  >
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {canEdit && (
        <button
          type="button"
          onClick={onCreate}
          disabled={creating}
          className="group flex min-h-[156px] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-white/10 text-neutral-500 transition-colors hover:border-white/25 hover:text-neutral-200"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-white/[0.04] text-[22px] transition-transform group-hover:scale-110">
            {creating ? <Spin className="size-4" /> : <Icon name="add" />}
          </span>
          <span className="text-sm">Start a new idea</span>
        </button>
      )}
      {ideas.map((idea, i) => {
        const preview = docText(idea.content);
        return (
          <motion.button
            key={idea.id}
            type="button"
            onClick={() => onOpen(idea.id)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 9) * 0.03 }}
            whileHover={{ y: -2 }}
            className="flex min-h-[156px] flex-col gap-2 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.04]"
          >
            <span className="text-2xl leading-none">{idea.emoji || '💡'}</span>
            <span className="line-clamp-2 text-base font-semibold text-white">
              {ideaTitle(idea)}
            </span>
            <span className="line-clamp-3 flex-1 text-xs leading-relaxed text-neutral-500">
              {preview || 'Empty draft'}
            </span>
            <span className="text-[11px] text-neutral-600">
              Edited {ago(idea.updatedAt)}
            </span>
          </motion.button>
        );
      })}
      {!canEdit && ideas.length === 0 && (
        <p className="col-span-full rounded-3xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-neutral-500">
          No ideas written down yet.
        </p>
      )}
    </div>
  </SectionShell>
);
