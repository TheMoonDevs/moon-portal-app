'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

/**
 * A dark hover card that says what an indicator means. Opens on hover and
 * focus; on touch screens a tap opens it.
 */
export const Tip = ({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) => (
  <TooltipPrimitive.Root delayDuration={120}>
    <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={6}
        collisionPadding={12}
        className="z-[100] max-w-[280px] rounded-xl border border-white/10 bg-neutral-900/95 px-3 py-2.5 text-xs leading-relaxed text-neutral-300 shadow-2xl backdrop-blur animate-in fade-in-0 zoom-in-95"
      >
        {content}
        <TooltipPrimitive.Arrow className="fill-neutral-900" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
);

export const TipProvider = TooltipPrimitive.Provider;

/** A heading line inside a tip. */
export const TipTitle = ({ children }: { children: ReactNode }) => (
  <p className="mb-1 font-semibold text-white">{children}</p>
);

/** A row inside a tip: a label and its value on the right. */
export const TipRow = ({
  label,
  value,
  color,
}: {
  label: ReactNode;
  value: ReactNode;
  color?: string | null;
}) => (
  <p className="flex items-center gap-2">
    {color !== undefined && (
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color || '#a3a3a3' }}
      />
    )}
    <span className="min-w-0 flex-1 truncate">{label}</span>
    <span className="shrink-0 font-medium text-white">{value}</span>
  </p>
);
