'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from '../../Admin/shared/AdminUI';

/** The heading and frame every section of a project page shares. */
export const SectionShell = ({
  icon,
  title,
  description,
  actions,
  children,
  className,
}: {
  icon: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className={cn(
      'mx-auto w-full max-w-5xl px-5 pb-24 pt-8 md:px-10 md:pt-12',
      className,
    )}
  >
    <header className="mb-6 flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        <p className="mb-2 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[22px] text-neutral-300">
          <Icon name={icon} />
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-xl text-sm text-neutral-500">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
    {children}
  </motion.section>
);

/** A small number with a label, for the top of a section. */
export const Stat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) => (
  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
      {label}
    </p>
    <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    {hint && <p className="text-[11px] text-neutral-500">{hint}</p>}
  </div>
);
