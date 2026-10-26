'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { Look, LookPart } from '@/lib/avatar/look';
import {
  HAIR_HEX,
  LOOK_LABELS,
  LOOK_OPTIONS,
  LOOK_PARTS,
  lookOf,
  OUTFIT_HEX,
  randomLook,
  SKIN_HEX,
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
  hairColor: HAIR_HEX,
  outfitColor: OUTFIT_HEX,
};

const label = (value: string) => value[0].toUpperCase() + value.slice(1);

/**
 * Dress up your character in the World: pick each part and see it on the
 * spot. Claude can do the same through the portal's MCP tools.
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
  if (!user) return null;
  return (
    <CharacterEditor
      saved={lookOf(user.id, user.look)}
      brand={brand}
      company={company?.name ?? 'Portal'}
      onSave={async (look) => {
        try {
          await PortalSdk.putData('/api/user/look', { look });
          await refetchUser();
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
  brand,
  company,
  onSave,
}: {
  saved: Look;
  brand: WorldBrand;
  company: string;
  onSave: (look: Look) => Promise<void>;
}) => {
  const savedKey = JSON.stringify(saved);
  const [look, setLook] = useState<Look>(saved);
  const [saving, setSaving] = useState(false);
  // Start again from what is saved whenever that changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setLook(saved), [savedKey]);
  const dirty = JSON.stringify(look) !== savedKey;

  const save = async () => {
    setSaving(true);
    await onSave(look);
    setSaving(false);
  };

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
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          Or just ask Claude, for example{' '}
          <span className="font-medium text-neutral-700">
            “give my character pink hair, a crown and a cat”
          </span>
          .
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {LOOK_PARTS.map((part) => {
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
                          'size-7 rounded-full border-2 transition-transform hover:scale-110',
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
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        on
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
                      )}
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
  );
};
