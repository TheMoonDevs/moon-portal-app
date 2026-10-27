'use client';

import { motion } from 'framer-motion';

import { Icon } from '../../Admin/shared/AdminUI';
import { SectionShell } from './SectionShell';

const BARS = [38, 52, 44, 61, 58, 72, 66, 80, 76, 91, 86, 98];

/** KPIs are on the way; a preview of what the page will hold. */
export const KpiSection = () => (
  <SectionShell
    icon="monitoring"
    title="KPI"
    description="The numbers that say whether the project is working."
  >
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-6 md:p-10">
      <div
        aria-hidden
        className="pointer-events-none grid select-none gap-4 opacity-40 blur-[2px] md:grid-cols-3"
      >
        {['Reach', 'Revenue', 'Retention'].map((label, i) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
          >
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="text-2xl font-semibold text-white">
              {['48.2k', '₹3.1L', '64%'][i]}
            </p>
            <div className="mt-4 flex h-20 items-end gap-1">
              {BARS.map((h, j) => (
                <motion.span
                  key={j}
                  initial={{ height: 0 }}
                  animate={{ height: `${((h + i * 7) % 100) + 5}%` }}
                  transition={{ delay: 0.03 * j, duration: 0.5 }}
                  className="flex-1 rounded-sm bg-gradient-to-t from-sky-500/40 to-violet-400/60"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950/40 text-center backdrop-blur-[1px]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
          <Icon name="auto_awesome" className="text-[14px]" />
          Coming soon
        </span>
        <p className="max-w-sm text-sm text-neutral-300">
          Track the metrics that matter for this project, with targets and
          trends, right next to its goals.
        </p>
      </div>
    </div>
  </SectionShell>
);
