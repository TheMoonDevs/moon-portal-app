'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { Look, LookLock, LookPart } from '@/lib/avatar/look';
import {
  EYE_HEX,
  HAIR_HEX,
  lockMessage,
  LOOK_GROUPS,
  LOOK_LABELS,
  LOOK_LOCK_DAYS,
  LOOK_OPTIONS,
  LOOK_STYLES,
  LOOK_UNLOCK_POINTS,
  lookOf,
  OUTFIT_HEX,
  randomLook,
  SKIN_HEX,
  styled,
} from '@/lib/avatar/look';
import { cn } from '@/lib/utils';
import type { WorldBrand } from '@/lib/world/state';
import { brandOf } from '@/lib/world/state';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

const CharacterPreview = dynamic(() => import('./CharacterPreview'), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse" />,
});

/** Parts shown as colour dots instead of words. */
const SWATCHES: Partial<Record<LookPart, Record<string, string>>> = {
  skin: SKIN_HEX,
  eyeColor: EYE_HEX,
  hairColor: HAIR_HEX,
  outfitColor: OUTFIT_HEX,
};

const label = (value: string) => value[0].toUpperCase() + value.slice(1);

/**
 * Dress up your character in the World: pick an anime style or each part
 * and see it on the spot. Claude can do the same through the portal's MCP
 * tools. A saved look stays for a while (see the lock).
 */
export const CharacterSection = () => {
  const { user, refetchUser } = useUser();
  const { companies } = useWorkspace();
  const company = companies[0]?.company;
  const brand = useMemo(
    () =>
      brandOf(
        company ?? { id: user?.id ?? 'portal', color: '#2563eb', logo: null },
      ),
    [company, user?.id],
  );
  const [state, setState] = useState<{ look: Look; lock: LookLock } | null>(
    null,
  );
  const load = useCallback(async () => {
    const res = await PortalSdk.getData('/api/user/look', null).catch(
      () => null,
    );
    if (res?.data) setState(res.data);
  }, []);
  useEffect(() => {
    if (user?.id) load();
  }, [user?.id, load]);

  if (!user) return null;
  return (
    <CharacterEditor
      saved={state?.look ?? lookOf(user.id, user.look)}
      lock={state?.lock ?? null}
      brand={brand}
      company={company?.name ?? 'Portal'}
      onSave={async (look) => {
        try {
          await PortalSdk.putData('/api/user/look', { look });
          await Promise.all([refetchUser(), load()]);
          toast.success('Your character is saved');
        } catch (err: any) {
          toast.error(err?.error ?? 'Could not save your character.');
        }
      }}
    />
  );
};

export const CharacterEditor = ({
  saved,
  lock,
  brand,
  company,
  onSave,
}: {
  saved: Look;
  lock: LookLock | null;
  brand: WorldBrand;
  company: string;
  onSave: (look: Look) => Promise<void>;
}) => {
  const savedKey = JSON.stringify(saved);
  const [look, setLook] = useState<Look>(saved);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Start again from what is saved whenever that changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setLook(saved), [savedKey]);
  const dirty = JSON.stringify(look) !== savedKey;
  const locked = !!lock?.locked;
  useEffect(() => setConfirming(false), [look]);

  const save = async () => {
    if (!confirming) return setConfirming(true);
    setSaving(true);
    await onSave(look);
    setSaving(false);
    setConfirming(false);
  };

  const chip = (on: boolean) =>
    cn(
      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
      on
        ? 'bg-neutral-900 text-white'
        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
    );

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="flex shrink-0 flex-col gap-2 md:w-64">
        <div className="h-64 overflow-hidden rounded-2xl bg-gradient-to-b from-sky-50 to-neutral-100 md:h-72">
          <CharacterPreview look={look} brand={brand} company={company} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLook(randomLook())}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            <span className="material-symbols-outlined !text-base">casino</span>
            Surprise me
          </button>
          {dirty && (
            <button
              type="button"
              onClick={() => setLook(saved)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Undo
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || locked}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-40',
            confirming
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-neutral-900 hover:bg-neutral-700',
          )}
        >
          {saving
            ? 'Saving…'
            : confirming
              ? `Yes, keep this look for ${LOOK_LOCK_DAYS} days`
              : 'Save my look'}
        </button>
        <p
          className={cn(
            'rounded-lg px-3 py-2 text-xs',
            locked
              ? 'bg-amber-50 text-amber-800'
              : 'bg-neutral-50 text-neutral-500',
          )}
        >
          {lock
            ? lockMessage(lock)
            : `A saved look stays for ${LOOK_LOCK_DAYS} days, or until you earn ${LOOK_UNLOCK_POINTS} more work points.`}
          {locked && ' You can still try looks on here.'}
        </p>
        <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          Or just ask Claude, for example{' '}
          <span className="font-medium text-neutral-700">
            “make me a samurai with pink hair”
          </span>
          .
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-neutral-600">
            Anime styles
          </p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {LOOK_STYLES.map((style) => (
              <button
                key={style.name}
                type="button"
                onClick={() => setLook(styled(look, style.name) ?? look)}
                className="flex flex-col items-center gap-0.5 rounded-xl border border-neutral-200 px-1 py-2 text-[11px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
              >
                <span className="text-xl leading-none">{style.emoji}</span>
                {style.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
          {LOOK_GROUPS.map((group, i) => (
            <button
              key={group.label}
              type="button"
              onClick={() => setTab(i)}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
                tab === i
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800',
              )}
            >
              {group.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {LOOK_GROUPS[tab].parts.map((part) => {
            const swatches = SWATCHES[part];
            return (
              <div key={part}>
                <p className="mb-1 text-xs font-semibold text-neutral-600">
                  {LOOK_LABELS[part]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {LOOK_OPTIONS[part].map((value) => {
                    const on = look[part] === value;
                    const set = () => setLook({ ...look, [part]: value });
                    if (swatches)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={set}
                          title={label(value)}
                          aria-label={label(value)}
                          aria-pressed={on}
                          className={cn(
                            'flex size-7 items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
                            on
                              ? 'border-neutral-900 ring-2 ring-white ring-offset-1 ring-offset-neutral-900'
                              : 'border-white shadow',
                          )}
                          style={{
                            background:
                              value === 'brand'
                                ? brand.primary
                                : (swatches[value] ?? '#ffffff'),
                          }}
                        >
                          {value === 'brand' && (
                            <span className="material-symbols-outlined !text-sm text-white">
                              star
                            </span>
                          )}
                        </button>
                      );
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={set}
                        aria-pressed={on}
                        className={chip(on)}
                      >
                        {label(value)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
