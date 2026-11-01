'use client';

import { useMemo } from 'react';

import { markdownToHtml } from '@/lib/onboarding/markdown';
import { cn } from '@/lib/utils';

/**
 * Markdown shown as a readable document: onboarding agreements and course
 * lessons. `paper` is a white sheet (agreements read like the real thing);
 * `dark` sits on the dark admin and portal screens.
 */
export const DocProse = ({
  markdown,
  tone = 'paper',
  className,
}: {
  markdown: string;
  tone?: 'paper' | 'dark' | 'light';
  className?: string;
}) => {
  const html = useMemo(() => markdownToHtml(markdown), [markdown]);
  return (
    <div
      className={cn(
        'text-[15px] leading-relaxed',
        '[&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight',
        '[&_h2]:mb-2 [&_h2]:mt-7 [&_h2]:text-base [&_h2]:font-semibold',
        '[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-semibold',
        '[&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold',
        '[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_hr]:my-6',
        '[&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px]',
        '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-3',
        '[&_table]:my-4 [&_table]:w-full [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left',
        tone === 'dark'
          ? 'text-neutral-300 [&_a]:text-sky-300 [&_blockquote]:border-white/20 [&_code]:bg-white/10 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-neutral-100 [&_hr]:border-white/10 [&_pre]:bg-white/[0.06] [&_strong]:text-white [&_td]:border-white/10 [&_th]:border-white/10'
          : 'text-zinc-700 [&_a]:text-blue-700 [&_blockquote]:border-zinc-300 [&_code]:bg-zinc-100 [&_h1]:text-zinc-950 [&_h2]:text-zinc-900 [&_h3]:text-zinc-900 [&_hr]:border-zinc-200 [&_pre]:bg-zinc-100 [&_strong]:text-zinc-900 [&_td]:border-zinc-200 [&_th]:border-zinc-200',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
