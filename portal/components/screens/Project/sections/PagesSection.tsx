'use client';

import type { ProjectPage } from '@db/client';
import { motion } from 'framer-motion';

import { childPages } from '@/lib/workspace/projectPages';

import { AdminButton, Icon, Spin } from '../../Admin/shared/AdminUI';
import { ago, docText, pageTitle } from '../types';
import { SectionShell } from './SectionShell';

/** Pages as cards, with a card to start a new one. */
const PageCards = ({
  pages,
  all,
  canEdit,
  creating,
  newLabel,
  emptyLabel,
  onOpen,
  onCreate,
}: {
  pages: ProjectPage[];
  /** Every page of the project, to count what is inside each card. */
  all: ProjectPage[];
  canEdit: boolean;
  creating: boolean;
  newLabel: string;
  emptyLabel: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) => (
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
        <span className="text-sm">{newLabel}</span>
      </button>
    )}
    {pages.map((page, i) => {
      const preview = docText(page.content);
      const inside = childPages(all, page.id).length;
      return (
        <motion.button
          key={page.id}
          type="button"
          onClick={() => onOpen(page.id)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 9) * 0.03 }}
          whileHover={{ y: -2 }}
          className="flex min-h-[156px] flex-col gap-2 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.04]"
        >
          <span className="text-2xl leading-none">{page.emoji || '📄'}</span>
          <span className="line-clamp-2 text-base font-semibold text-white">
            {pageTitle(page)}
          </span>
          <span className="line-clamp-3 flex-1 text-xs leading-relaxed text-neutral-500">
            {preview || 'Empty page'}
          </span>
          <span className="flex items-center gap-3 text-[11px] text-neutral-600">
            <span>Edited {ago(page.updatedAt)}</span>
            {inside > 0 && (
              <span className="flex items-center gap-1">
                <Icon name="description" className="text-[13px]" />
                {inside} inside
              </span>
            )}
          </span>
        </motion.button>
      );
    })}
    {!canEdit && pages.length === 0 && (
      <p className="col-span-full rounded-3xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-neutral-500">
        {emptyLabel}
      </p>
    )}
  </div>
);

/** The project's top-level pages as cards; open one to write in it. */
export const PagesGallery = ({
  pages,
  canEdit,
  creating,
  onOpen,
  onCreate,
}: {
  pages: ProjectPage[];
  canEdit: boolean;
  creating: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) => (
  <SectionShell
    icon="description"
    title="Pages"
    description="Docs, policies, notes and rough drafts. Pages can hold pages inside them, as deep as you need."
    actions={
      canEdit && (
        <AdminButton
          tone="primary"
          size="sm"
          icon="add"
          loading={creating}
          onClick={onCreate}
        >
          New page
        </AdminButton>
      )
    }
  >
    <PageCards
      pages={childPages(pages, null)}
      all={pages}
      canEdit={canEdit}
      creating={creating}
      newLabel="Start a new page"
      emptyLabel="No pages written yet."
      onOpen={onOpen}
      onCreate={onCreate}
    />
  </SectionShell>
);

/** The pages inside a page, under its body. */
export const PagesInside = ({
  parent,
  pages,
  canEdit,
  creating,
  onOpen,
  onCreate,
}: {
  parent: ProjectPage;
  pages: ProjectPage[];
  canEdit: boolean;
  creating: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) => {
  const inside = childPages(pages, parent.id);
  if (!canEdit && !inside.length) return null;
  return (
    <section className="mt-12 border-t border-white/[0.06] pb-16 pt-6">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
        <Icon name="description" className="text-[15px]" />
        Pages inside
      </h2>
      <PageCards
        pages={inside}
        all={pages}
        canEdit={canEdit}
        creating={creating}
        newLabel="Add a page inside"
        emptyLabel=""
        onOpen={onOpen}
        onCreate={onCreate}
      />
    </section>
  );
};
