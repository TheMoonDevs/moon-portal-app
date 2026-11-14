'use client';

import * as Menu from '@radix-ui/react-context-menu';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

import { Icon } from '../Admin/shared/AdminUI';

export type RowAction =
  | {
      label: string;
      icon: string;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
    }
  | {
      label: string;
      icon: string;
      /** A small menu of choices, like a plan's status. */
      sub: { label: string; checked?: boolean; onSelect: () => void }[];
    }
  | 'separator'
  | null
  | undefined
  | false;

const itemClass =
  'flex cursor-default select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-neutral-200 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white data-[disabled]:opacity-40';

const panelClass =
  'z-[60] min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl shadow-black/50 backdrop-blur';

/**
 * Right-click (or long-press) menu for a row in the projects sidebar.
 * Falsy entries are skipped, so actions can be listed with conditions.
 */
export const RowMenu = ({
  actions,
  title,
  children,
}: {
  actions: RowAction[];
  /** A small heading at the top of the menu. */
  title?: string;
  children: React.ReactNode;
}) => {
  const list = actions.filter(Boolean) as Exclude<
    RowAction,
    null | undefined | false
  >[];
  // No separators at the ends, or two in a row.
  const tidy = list.filter(
    (a, i) =>
      a !== 'separator' ||
      (i > 0 && i < list.length - 1 && list[i - 1] !== 'separator'),
  );
  return (
    <Menu.Root>
      <Menu.Trigger asChild>{children}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className={panelClass}>
          {title && (
            <Menu.Label className="truncate px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              {title}
            </Menu.Label>
          )}
          {tidy.map((a, i) =>
            a === 'separator' ? (
              <Menu.Separator key={i} className="my-1 h-px bg-white/[0.07]" />
            ) : 'sub' in a ? (
              <Menu.Sub key={a.label}>
                <Menu.SubTrigger className={itemClass}>
                  <Icon
                    name={a.icon}
                    className="text-[17px] text-neutral-400"
                  />
                  <span className="flex-1">{a.label}</span>
                  <Icon
                    name="chevron_right"
                    className="text-[16px] text-neutral-500"
                  />
                </Menu.SubTrigger>
                <Menu.Portal>
                  <Menu.SubContent className={panelClass}>
                    {a.sub.map((s) => (
                      <Menu.Item
                        key={s.label}
                        onSelect={s.onSelect}
                        className={itemClass}
                      >
                        <Icon
                          name="check"
                          className={cn(
                            'text-[16px]',
                            s.checked ? 'text-white' : 'opacity-0',
                          )}
                        />
                        {s.label}
                      </Menu.Item>
                    ))}
                  </Menu.SubContent>
                </Menu.Portal>
              </Menu.Sub>
            ) : (
              <Menu.Item
                key={a.label}
                disabled={a.disabled}
                onSelect={a.onSelect}
                className={cn(
                  itemClass,
                  a.danger &&
                    'text-rose-300 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-200',
                )}
              >
                <Icon
                  name={a.icon}
                  className={cn(
                    'text-[17px]',
                    a.danger ? 'text-rose-300' : 'text-neutral-400',
                  )}
                />
                {a.label}
              </Menu.Item>
            ),
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
};

/** Copies a portal link and says so. */
export const copyLink = (path: string) => {
  const url = `${window.location.origin}${path}`;
  navigator.clipboard
    ?.writeText(url)
    .then(() => toast.success('Link copied'))
    .catch(() => toast.error('Could not copy the link'));
};

export const openInNewTab = (path: string) =>
  window.open(path, '_blank', 'noopener');
