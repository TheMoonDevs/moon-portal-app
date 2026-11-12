import Link from 'next/link';
import type { ReactNode } from 'react';

import { LEGAL, LEGAL_PAGES } from '@/lib/legal/info';
import { cn } from '@/lib/utils';

/*
 * The frame of the public legal pages: a plain, readable column with links
 * between the three pages, a table of contents, and the contact line. They
 * open without a login (see middleware.ts), for the store listings.
 */

// Paragraphs, lists, links and small tables inside the page text.
const PROSE =
  'text-[15px] leading-relaxed [&_a]:text-[#5b2ee0] [&_a]:underline dark:[&_a]:text-[#a98bff] [&_p+p]:mt-3 [&_p+ul]:mt-2 [&_ul+p]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_h3+p]:mt-1 [&_h3+ul]:mt-2 [&_table]:mt-3 [&_table]:w-full [&_table]:text-[14px] [&_td]:border-t [&_td]:border-slate-200 dark:[&_td]:border-white/10 [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:pb-1 [&_th]:pr-3 [&_th]:text-left [&_th]:text-[12px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.06em] [&_th]:text-slate-500';

export type LegalSection = { id: string; title: string; body: ReactNode };

export const LegalPage = ({
  current,
  title,
  intro,
  sections,
}: {
  current: (typeof LEGAL_PAGES)[number]['href'];
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}) => (
  <div className="min-h-dvh bg-white text-slate-800 dark:bg-[#0a0a0b] dark:text-slate-200">
    <header className="border-b border-slate-200 dark:border-white/10">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 p-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="" width={24} height={24} />
          {LEGAL.product}
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {LEGAL_PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={p.href === current ? 'page' : undefined}
              className={cn(
                'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                p.href === current &&
                  'font-semibold text-slate-900 dark:text-white',
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <h1 className="text-[32px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
        {title}
      </h1>
      <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
        Last updated {LEGAL.updated}
      </p>
      <div className={cn(PROSE, 'mt-6')}>{intro}</div>

      {sections.length > 3 ? (
        <nav
          aria-label="Contents"
          className="mt-8 rounded-lg border border-slate-200 p-4 dark:border-white/10"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Contents
          </p>
          <ol className="mt-2 grid gap-1 text-[14px] sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
                >
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="mt-10 scroll-mt-6">
          <h2 className="text-[20px] font-semibold text-slate-900 dark:text-white">
            {sections.length > 3 ? `${i + 1}. ` : ''}
            {s.title}
          </h2>
          <div className={cn(PROSE, 'mt-3')}>{s.body}</div>
        </section>
      ))}

      <footer className="mt-16 border-t border-slate-200 pt-6 text-[13px] text-slate-500 dark:border-white/10 dark:text-slate-400">
        {LEGAL.product} is run by {LEGAL.operator}
        {LEGAL.address ? `, ${LEGAL.address}` : ''}. Questions:{' '}
        <a className="underline" href={`mailto:${LEGAL.email}`}>
          {LEGAL.email}
        </a>
        .
      </footer>
    </main>
  </div>
);

/** A link to the contact email. */
export const Email = () => <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
