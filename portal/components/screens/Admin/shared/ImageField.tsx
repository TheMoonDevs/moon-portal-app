'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { uploadImage } from '@/utils/helpers/uploads';

import { Icon, TextInput } from './AdminUI';

/**
 * An image picker: preview, an Upload button, and a small "paste a link"
 * fallback. Calls `onChange` with the hosted URL once the upload finishes.
 */
export const ImageField = ({
  value,
  onChange,
  shape = 'rounded',
  size = 56,
  allowLink = true,
  className,
}: {
  value: string;
  onChange: (url: string) => void;
  shape?: 'rounded' | 'circle' | 'hex';
  size?: number;
  allowLink?: boolean;
  className?: string;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showLink, setShowLink] = useState(false);

  const pick = async (file: File) => {
    setUploading(true);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            width: size,
            height: size,
            ...(shape === 'hex' && {
              clipPath:
                'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
            }),
          }}
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-white/15 bg-white/[0.04] text-neutral-500 transition-colors hover:border-white/30 hover:text-neutral-300',
            shape === 'circle' ? 'rounded-full' : 'rounded-xl',
          )}
          aria-label="Upload image"
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <Icon name="add_photo_alternate" className="text-[22px]" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) pick(file);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm text-neutral-200 transition-colors hover:bg-white/[0.1] disabled:opacity-50"
          >
            <Icon name="upload" className="text-[18px]" />
            {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="h-9 rounded-lg px-2 text-xs text-neutral-500 hover:text-rose-300"
            >
              Remove
            </button>
          )}
          {allowLink && !showLink && (
            <button
              type="button"
              onClick={() => setShowLink(true)}
              className="h-9 px-1 text-xs text-neutral-500 hover:text-neutral-300"
            >
              Paste a link instead
            </button>
          )}
        </div>
      </div>
      {allowLink && showLink && (
        <TextInput
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
        />
      )}
    </div>
  );
};
