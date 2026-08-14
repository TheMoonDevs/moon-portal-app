/* eslint-disable @next/next/no-img-element */
'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import React, { forwardRef, useState } from 'react';

import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*                                   Icon                                     */
/* -------------------------------------------------------------------------- */

export const Icon = ({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) => (
  <span
    aria-hidden
    className={cn('material-symbols-outlined select-none', className)}
    style={{
      fontSize: 'inherit',
      lineHeight: 1,
      ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}),
    }}
  >
    {name}
  </span>
);

/* -------------------------------------------------------------------------- */
/*                                  Buttons                                   */
/* -------------------------------------------------------------------------- */

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonTones: Record<ButtonTone, string> = {
  primary:
    'bg-white text-neutral-950 hover:bg-neutral-200 active:bg-neutral-300 shadow-sm',
  secondary:
    'border border-white/10 bg-white/[0.04] text-neutral-100 hover:bg-white/[0.09] hover:border-white/20',
  ghost: 'text-neutral-300 hover:bg-white/[0.06] hover:text-white',
  danger:
    'border border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
};

export interface AdminButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  loading?: boolean;
}

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(
  (
    {
      tone = 'secondary',
      size = 'md',
      icon,
      iconRight,
      loading,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
        'disabled:pointer-events-none disabled:opacity-40',
        buttonTones[tone],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spin className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      ) : (
        icon && <Icon name={icon} className="text-[1.15em]" />
      )}
      {children}
      {iconRight && !loading && (
        <Icon name={iconRight} className="text-[1.15em]" />
      )}
    </button>
  ),
);
AdminButton.displayName = 'AdminButton';

export const IconAction = ({
  icon,
  label,
  tone = 'default',
  loading,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  label: string;
  tone?: 'default' | 'danger';
  loading?: boolean;
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={loading || props.disabled}
    className={cn(
      'inline-flex size-8 items-center justify-center rounded-lg text-[18px] transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-40',
      tone === 'danger'
        ? 'text-neutral-400 hover:bg-rose-500/15 hover:text-rose-300'
        : 'text-neutral-400 hover:bg-white/10 hover:text-white',
      className,
    )}
    {...props}
  >
    {loading ? <Spin className="size-4" /> : <Icon name={icon} />}
  </button>
);

export const Spin = ({ className }: { className?: string }) => (
  <span
    className={cn(
      'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80',
      className,
    )}
    role="status"
    aria-label="Loading"
  />
);

/* -------------------------------------------------------------------------- */
/*                              Layout primitives                             */
/* -------------------------------------------------------------------------- */

export const Panel = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rounded-2xl border border-white/[0.07] bg-neutral-900/40 backdrop-blur-sm',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const PanelHeader = ({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: string;
  actions?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4',
      className,
    )}
  >
    <div className="flex min-w-0 items-start gap-3">
      {icon && (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[18px] text-neutral-300">
          <Icon name={icon} />
        </span>
      )}
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-neutral-100">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                 Stat cards                                 */
/* -------------------------------------------------------------------------- */

export const StatCard = ({
  label,
  value,
  icon,
  hint,
  tone = 'neutral',
  loading,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon: string;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'info';
  loading?: boolean;
  onClick?: () => void;
}) => {
  const tones = {
    neutral: 'text-neutral-300 bg-white/[0.06]',
    positive: 'text-emerald-300 bg-emerald-500/10',
    warning: 'text-amber-300 bg-amber-500/10',
    danger: 'text-rose-300 bg-rose-500/10',
    info: 'text-sky-300 bg-sky-500/10',
  } as const;

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-neutral-900/40 p-4 text-left transition-colors',
        onClick && 'hover:border-white/15 hover:bg-neutral-900/70',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl text-[22px]',
          tones[tone],
        )}
      >
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        {loading ? (
          <div className="mt-1.5 h-6 w-12 animate-pulse rounded bg-white/10" />
        ) : (
          <p className="text-2xl font-semibold leading-tight text-white">
            {value}
          </p>
        )}
        {hint && (
          <p className="mt-0.5 truncate text-xs text-neutral-500">{hint}</p>
        )}
      </div>
    </Wrapper>
  );
};

/* -------------------------------------------------------------------------- */
/*                              Form primitives                               */
/* -------------------------------------------------------------------------- */

export const inputBase =
  'w-full rounded-lg border border-white/10 bg-neutral-900/80 px-3 text-sm text-neutral-100 placeholder:text-neutral-600 transition-colors ' +
  'focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50';

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputBase, 'h-10', className)} {...props} />
));
TextInput.displayName = 'TextInput';

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(inputBase, 'min-h-[92px] resize-y py-2.5', className)}
    {...props}
  />
));
TextArea.displayName = 'TextArea';

export const NativeSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        inputBase,
        'h-10 cursor-pointer appearance-none pr-9 [&>option]:bg-neutral-900',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <Icon
      name="expand_more"
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-neutral-500"
    />
  </div>
));
NativeSelect.displayName = 'NativeSelect';

export const DateInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="date"
    className={cn(inputBase, 'h-10 [color-scheme:dark]', className)}
    {...props}
  />
));
DateInput.displayName = 'DateInput';

export const Field = ({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    {label && (
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-400"
      >
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="flex items-center gap-1 text-xs text-rose-400">
        <Icon name="error" className="text-[14px]" />
        {error}
      </p>
    ) : (
      hint && <p className="text-xs text-neutral-600">{hint}</p>
    )}
  </div>
);

export const ToggleSwitch = ({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      'flex w-full items-center justify-between gap-4 rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2.5 text-left transition-colors',
      'hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50',
      className,
    )}
  >
    <span className="min-w-0">
      {label && <span className="block text-sm text-neutral-200">{label}</span>}
      {description && (
        <span className="block text-xs text-neutral-500">{description}</span>
      )}
    </span>
    <span
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-emerald-500/80' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          'absolute size-3.5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </span>
  </button>
);

/** Square check box used inside pickers and permission grids. */
export const CheckBox = ({
  checked,
  size = 'md',
  className,
}: {
  checked: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center rounded border transition-colors',
      size === 'sm' ? 'size-4 text-[12px]' : 'size-5 text-[14px]',
      checked
        ? 'border-white bg-white text-neutral-950'
        : 'border-white/20 text-transparent',
      className,
    )}
  >
    <Icon name="check" />
  </span>
);

/* -------------------------------------------------------------------------- */
/*                            Search & segmented                              */
/* -------------------------------------------------------------------------- */

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) => (
  <div className={cn('relative', className)}>
    <Icon
      name="search"
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-500"
    />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(inputBase, 'h-10 pl-9 pr-9')}
    />
    {value && (
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => onChange('')}
        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-[16px] text-neutral-500 hover:bg-white/10 hover:text-neutral-200"
      >
        <Icon name="close" />
      </button>
    )}
  </div>
);

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
  icon?: string;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-white/[0.07] bg-neutral-900/60 p-1',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-white/[0.12] text-white'
              : 'text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200',
          )}
        >
          {option.icon && <Icon name={option.icon} className="text-[16px]" />}
          {option.label}
          {typeof option.count === 'number' && (
            <span
              className={cn(
                'rounded px-1.5 py-px text-[10px] font-semibold',
                value === option.value
                  ? 'bg-white/15 text-neutral-200'
                  : 'bg-white/[0.07] text-neutral-500',
              )}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Pills                                    */
/* -------------------------------------------------------------------------- */

export type PillTone =
  | 'neutral'
  | 'positive'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple';

const pillTones: Record<PillTone, string> = {
  neutral: 'border-white/10 bg-white/[0.06] text-neutral-300',
  positive: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  purple: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
};

export const Pill = ({
  children,
  tone = 'neutral',
  icon,
  className,
}: {
  children: ReactNode;
  tone?: PillTone;
  icon?: string;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
      pillTones[tone],
      className,
    )}
  >
    {icon && <Icon name={icon} className="text-[13px]" />}
    {children}
  </span>
);

/* -------------------------------------------------------------------------- */
/*                                  Avatar                                    */
/* -------------------------------------------------------------------------- */

const initialsOf = (name?: string | null) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

export const UserAvatar = ({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(10, size / 2.8) }}
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-800 font-semibold text-neutral-400',
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name || ''}
          onError={() => setFailed(true)}
          className="size-full object-cover object-center"
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*                            Empty & loading states                          */
/* -------------------------------------------------------------------------- */

export const EmptyState = ({
  icon = 'inbox',
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
      className,
    )}
  >
    <span className="flex size-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-[26px] text-neutral-600">
      <Icon name={icon} />
    </span>
    <div>
      <p className="text-sm font-medium text-neutral-300">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
          {description}
        </p>
      )}
    </div>
    {action}
  </div>
);

export const SkeletonRows = ({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) => (
  <div className={cn('flex flex-col gap-2 p-3', className)}>
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
      >
        <div className="size-10 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/[0.04]" />
        </div>
        <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.04]" />
      </div>
    ))}
  </div>
);

export const CardSkeletons = ({ count = 6 }: { count?: number }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="h-32 animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.02]"
      />
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                   Modal                                    */
/* -------------------------------------------------------------------------- */

export const AdminModal = ({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
  } as const;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[61] flex max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden',
            'rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black/60',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            widths[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              {icon && (
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[20px] text-neutral-300">
                  <Icon name={icon} />
                </span>
              )}
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-base font-semibold text-white">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="mt-0.5 text-xs text-neutral-500">
                    {description}
                  </DialogPrimitive.Description>
                ) : (
                  <DialogPrimitive.Description className="sr-only">
                    {typeof title === 'string' ? title : 'Dialog'}
                  </DialogPrimitive.Description>
                )}
              </div>
            </div>
            <DialogPrimitive.Close asChild>
              <IconAction icon="close" label="Close" />
            </DialogPrimitive.Close>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>

          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] bg-neutral-900/40 px-5 py-3">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
}) => (
  <AdminModal
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    description={description}
    icon="warning"
    size="sm"
    footer={
      <>
        <AdminButton
          tone="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          Cancel
        </AdminButton>
        <AdminButton
          tone="danger"
          size="sm"
          icon="delete"
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </AdminButton>
      </>
    }
  >
    <p className="text-sm text-neutral-400">
      This action cannot be undone. Please confirm you want to continue.
    </p>
  </AdminModal>
);

/* -------------------------------------------------------------------------- */
/*                                Copy button                                 */
/* -------------------------------------------------------------------------- */

export const CopyButton = ({
  value,
  label = 'Copy',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const copy = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <IconAction
      icon={copied ? 'check' : 'content_copy'}
      label={copied ? 'Copied' : label}
      onClick={copy}
      className={cn(copied && 'text-emerald-400', className)}
    />
  );
};

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

export const formatDate = (value?: string | Date | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
