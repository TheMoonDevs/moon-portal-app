/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  BRAND_GROUP_LABELS,
  type BrandAsset,
  type BrandKit,
  emptyBrandKit,
  extOf,
  isBrandAssetFile,
  isBrandKitEmpty,
  isIgnoredBrandPath,
  kindOf,
  labelFromFileName,
  normalizeHex,
  parseColorsJson,
  parseFontFileName,
  skippedBrandFolder,
  skippedFolderOf,
} from '@/lib/brandKit';
import { cn } from '@/lib/utils';
import { uploadBrandFile } from '@/utils/helpers/uploads';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  Icon,
  IconAction,
  TextArea,
} from '../shared/AdminUI';
import { errorText } from './shared';

const KIND_ICONS: Record<BrandAsset['kind'], string> = {
  image: 'image',
  video: 'movie',
  audio: 'music_note',
  font: 'text_fields',
  document: 'description',
  other: 'draft',
};

const CHECKER = {
  backgroundImage:
    'linear-gradient(45deg,#ffffff0d 25%,transparent 25%),linear-gradient(-45deg,#ffffff0d 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ffffff0d 75%),linear-gradient(-45deg,transparent 75%,#ffffff0d 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
};

/** Uploads with a few at a time, reporting progress; failures are collected. */
async function uploadAll<T>(
  items: T[],
  fileOf: (item: T) => File,
  onProgress: (done: number) => void,
) {
  const urls = new Map<T, string>();
  const failed: string[] = [];
  let done = 0;
  const queue = [...items];
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const file = fileOf(item);
      try {
        urls.set(item, await uploadBrandFile(file));
      } catch (err) {
        failed.push((err as Error).message || file.name);
      }
      onProgress(++done);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return { urls, failed };
}

/** A file of a picked brand folder, its path relative to that folder. */
type FolderFile = { file: File; rel: string };

/** Files from an <input webkitdirectory>, with the picked folder's own name dropped. */
const folderFilesOf = (files: File[]): FolderFile[] =>
  files.map((file) => {
    const parts = (file.webkitRelativePath || file.name).split('/');
    return {
      file,
      rel: parts.length > 1 ? parts.slice(1).join('/') : parts[0],
    };
  });

type DirHandle = {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<DirHandle | FileHandle>;
};
type FileHandle = { kind: 'file'; name: string; getFile: () => Promise<File> };
type PickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read';
  }) => Promise<DirHandle>;
};

/**
 * Files of a brand folder picked with the File System Access API (Chromium),
 * without opening the folders a kit never uses (graphics/, node_modules/,
 * hidden ones), so a brand whose source holds thousands of frames reads as
 * just its kit. Each of those folders comes back as one skipped line.
 */
async function walkBrandFolder(dir: DirHandle, prefix = '') {
  const files: FolderFile[] = [];
  const skipped: string[] = [];
  for await (const entry of dir.values()) {
    const rel = `${prefix}${entry.name}`;
    if (entry.kind === 'directory') {
      const reason = skippedBrandFolder(entry.name);
      if (reason) skipped.push(`${rel}/ (${reason})`);
      else {
        const sub = await walkBrandFolder(entry, `${rel}/`);
        files.push(...sub.files);
        skipped.push(...sub.skipped);
      }
    } else {
      files.push({ file: await entry.getFile(), rel });
    }
  }
  return { files, skipped };
}

/**
 * Turns a picked brand folder (colors.json, brandguide.md, fonts/, logo/,
 * intros/, …) into a brand kit. Only images, video, audio and fonts are
 * uploaded; graphics/ (the source) and code are left out.
 */
async function importFolder(
  files: FolderFile[],
  onProgress: (text: string) => void,
): Promise<{
  kit: Partial<BrandKit>;
  failed: string[];
  uploaded: number;
  skipped: string[];
}> {
  type Entry = FolderFile & { dir: string; sub: string };
  const skipped: string[] = [];
  const folders = new Map<string, { reason: string; count: number }>();
  const entries: Entry[] = [];
  for (const { file, rel } of files) {
    const folder = skippedFolderOf(rel);
    if (folder) {
      const seen = folders.get(folder.dir);
      if (seen) seen.count++;
      else folders.set(folder.dir, { reason: folder.reason, count: 1 });
      continue;
    }
    if (isIgnoredBrandPath(rel)) continue;
    const dirs = rel.split('/').slice(0, -1);
    entries.push({
      file,
      rel,
      dir: (dirs[0] ?? '').toLowerCase(),
      sub: (dirs[1] ?? '').toLowerCase(),
    });
  }
  folders.forEach(({ reason, count }, dir) =>
    skipped.push(`${dir} (${reason}, ${count} file${count === 1 ? '' : 's'})`),
  );

  const kit: Partial<BrandKit> = {
    logos: [],
    fonts: [],
    assets: [],
  };

  // Text files at the top of the folder describe the brand.
  const colorsFile = entries.find(
    (e) => !e.dir && e.file.name.toLowerCase() === 'colors.json',
  );
  if (colorsFile)
    Object.assign(kit, parseColorsJson(await colorsFile.file.text()));
  const guideFile =
    entries.find((e) => !e.dir && /brand.?guide.*\.md$/i.test(e.file.name)) ??
    entries.find((e) => !e.dir && extOf(e.file.name) === 'md');
  if (guideFile) kit.guide = await guideFile.file.text();

  const paths = new Set(entries.map((e) => e.rel.toLowerCase()));
  const toUpload = entries.filter((e) => {
    if (!isBrandAssetFile(e.file.name)) {
      if (e !== colorsFile && e !== guideFile) skipped.push(e.rel);
      return false;
    }
    // A ProRes .mov master has a .webm with alpha next to it.
    const webm = e.rel.replace(/\.mov$/i, '.webm').toLowerCase();
    if (webm !== e.rel.toLowerCase() && paths.has(webm)) {
      skipped.push(`${e.rel} (ProRes master)`);
      return false;
    }
    return true;
  });

  onProgress(`Uploading 0 of ${toUpload.length}…`);
  const { urls, failed } = await uploadAll(
    toUpload,
    (e) => e.file,
    (n) => onProgress(`Uploading ${n} of ${toUpload.length}…`),
  );

  for (const e of toUpload) {
    const url = urls.get(e);
    if (!url) continue;
    const kind = kindOf(e.file.name);
    if (kind === 'font' || e.dir === 'fonts') {
      kit.fonts!.push({ ...parseFontFileName(e.file.name), url });
    } else if (e.dir === 'logo' && !e.sub && kind === 'image') {
      kit.logos!.push({ label: labelFromFileName(e.file.name), url });
    } else {
      kit.assets!.push({
        label: labelFromFileName(e.file.name),
        url,
        kind,
        group:
          e.dir === 'logo'
            ? e.sub === 'animated'
              ? 'animated logos'
              : e.sub || 'logo'
            : e.dir || 'other',
      });
    }
  }
  return { kit, failed, uploaded: urls.size, skipped };
}

/** Lets a font from the kit render its own preview. */
const useFontPreview = (family: string, url?: string, weight?: number) => {
  const name = `bk-${family}-${weight ?? 400}`.replace(/\s+/g, '-');
  useEffect(() => {
    if (!url || typeof FontFace === 'undefined') return;
    const face = new FontFace(name, `url(${url})`, {
      weight: String(weight ?? 400),
    });
    face
      .load()
      .then((f) => document.fonts.add(f))
      .catch(() => null);
  }, [name, url, weight]);
  return url ? name : undefined;
};

const FontRow = ({
  font,
  onRemove,
}: {
  font: BrandKit['fonts'][number];
  onRemove: () => void;
}) => {
  const preview = useFontPreview(font.family, font.url, font.weight);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
      <span
        className="w-10 text-center text-2xl text-white"
        style={{ fontFamily: preview, fontWeight: font.weight }}
      >
        Aa
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-neutral-200">{font.family}</p>
        <p className="text-xs text-neutral-500">
          {font.weight ?? 'Regular'}
          {font.role ? ` · ${font.role}` : ''}
        </p>
      </div>
      <IconAction icon="close" label="Remove font" onClick={onRemove} />
    </div>
  );
};

const Section = ({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-3 border-t border-white/[0.06] pt-5 first:border-0 first:pt-0">
    <div className="flex items-end justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

/** A hidden file input with a button that opens it. */
const PickFiles = ({
  label,
  icon = 'upload',
  accept,
  multiple = true,
  folder,
  busy,
  tone = 'ghost',
  onPick,
  onFiles,
}: {
  label: string;
  icon?: string;
  accept?: string;
  multiple?: boolean;
  folder?: boolean;
  busy?: boolean;
  tone?: 'ghost' | 'primary' | 'secondary';
  /** Opens its own picker instead; resolves false to fall back to the input. */
  onPick?: () => Promise<boolean>;
  onFiles: (files: File[]) => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (folder) ref.current?.setAttribute('webkitdirectory', '');
  }, [folder]);
  return (
    <>
      <AdminButton
        size="sm"
        tone={tone}
        icon={icon}
        loading={busy}
        onClick={async () => {
          if (!(await onPick?.())) ref.current?.click();
        }}
      >
        {label}
      </AdminButton>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple || folder}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
};

export const BrandKitEditor = ({
  open,
  onOpenChange,
  name,
  endpoint,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The company or project the kit belongs to. */
  name: string;
  /** PATCH endpoint that stores `{ brandKit }`. */
  endpoint: string;
  initial?: BrandKit | null;
  onSaved: () => void;
}) => {
  const [kit, setKit] = useState<BrandKit>(emptyBrandKit());
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');

  useEffect(() => {
    if (open) setKit({ ...emptyBrandKit(), ...(initial ?? {}) });
  }, [open, initial]);

  const update = (patch: Partial<BrandKit>) =>
    setKit((k) => ({ ...k, ...patch }));

  const groups = useMemo(() => {
    const map = new Map<string, { asset: BrandAsset; index: number }[]>();
    kit.assets.forEach((asset, index) => {
      const g = asset.group || 'other';
      map.set(g, [...(map.get(g) ?? []), { asset, index }]);
    });
    return Array.from(map.entries());
  }, [kit.assets]);

  const runUploads = async (
    label: string,
    files: File[],
    apply: (file: File, url: string) => void,
  ) => {
    setBusy(label);
    const { urls, failed } = await uploadAll(
      files,
      (f) => f,
      () => null,
    );
    files.forEach((f) => {
      const url = urls.get(f);
      if (url) apply(f, url);
    });
    setBusy(null);
    if (failed.length) toast.error(failed[0]);
  };

  const importBrandFolder = async (
    files: FolderFile[],
    skippedFolders: string[] = [],
  ) => {
    setBusy('import');
    try {
      const {
        kit: imported,
        failed,
        uploaded,
        skipped,
      } = await importFolder(files, (text) => setBusy(`import:${text}`));
      const skippedAll = [...skippedFolders, ...skipped];
      setKit((k) => ({
        ...k,
        name: imported.name ?? k.name,
        spectrum: imported.spectrum ?? k.spectrum,
        note: imported.note ?? k.note,
        guide: imported.guide ?? k.guide,
        colors: imported.colors?.length ? imported.colors : k.colors,
        logos: [...k.logos, ...(imported.logos ?? [])],
        fonts: [...k.fonts, ...(imported.fonts ?? [])],
        assets: [...k.assets, ...(imported.assets ?? [])],
      }));
      if (failed.length) {
        toast.error(
          `${failed.length} file${failed.length === 1 ? '' : 's'} could not be uploaded. ${failed[0]}`,
        );
      } else {
        toast.success(
          `Brand folder imported: ${uploaded} file${uploaded === 1 ? '' : 's'}. Review it and press Save.`,
          skippedAll.length
            ? {
                description: `Left out: ${skippedAll.slice(0, 4).join(', ')}${skippedAll.length > 4 ? ` and ${skippedAll.length - 4} more` : ''}`,
              }
            : undefined,
        );
      }
    } finally {
      setBusy(null);
    }
  };

  /** Chromium walks the folder itself and leaves graphics/ shut; other browsers get the folder input. */
  const pickBrandFolder = async () => {
    const w = window as PickerWindow;
    if (typeof w.showDirectoryPicker !== 'function') return false;
    let dir: DirHandle;
    try {
      dir = await w.showDirectoryPicker({
        id: 'portal-brand-kit',
        mode: 'read',
      });
    } catch {
      return true; // closed the picker
    }
    setBusy('import');
    try {
      const { files, skipped } = await walkBrandFolder(dir);
      await importBrandFolder(files, skipped);
    } catch (err) {
      setBusy(null);
      toast.error(errorText(err));
    }
    return true;
  };

  const applyPastedColors = () => {
    const parsed = parseColorsJson(pasted);
    if (!parsed?.colors?.length) {
      toast.error('That does not look like a colors.json file.');
      return;
    }
    update({
      colors: parsed.colors,
      name: parsed.name ?? kit.name,
      spectrum: parsed.spectrum ?? kit.spectrum,
    });
    setPasting(false);
    setPasted('');
  };

  const save = async () => {
    setSaving(true);
    try {
      await PortalSdk.patchData(endpoint, {
        brandKit: isBrandKitEmpty(kit) ? null : kit,
      });
      toast.success('Brand kit saved');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const importing = busy?.startsWith('import');

  return (
    <AdminModal
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      size="lg"
      icon="palette"
      title={`${name} brand kit`}
      description="Logos, colors, fonts and brand files, kept in one place."
      footer={
        <>
          <AdminButton
            tone="ghost"
            size="sm"
            disabled={!!busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AdminButton>
          <AdminButton
            tone="primary"
            size="sm"
            loading={saving}
            disabled={!!busy}
            onClick={save}
          >
            Save
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Import */}
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[22px] text-neutral-300">
            <Icon name="folder_zip" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">
              {importing
                ? busy!.slice('import:'.length) || 'Reading the folder…'
                : 'Have a brand folder?'}
            </p>
            <p className="text-xs text-neutral-500">
              Pick it and everything is filled in: colors.json, brandguide.md,
              fonts, logos, intros, outros and the rest. Its graphics/ source
              and code files are left out.
            </p>
          </div>
          <PickFiles
            folder
            tone="secondary"
            icon="drive_folder_upload"
            label="Import brand folder"
            busy={importing}
            onPick={pickBrandFolder}
            onFiles={(files) => importBrandFolder(folderFilesOf(files))}
          />
        </div>

        {(kit.name || kit.spectrum || kit.note) && (
          <div className="flex flex-col gap-1">
            {kit.name && (
              <p className="text-sm font-medium text-neutral-200">{kit.name}</p>
            )}
            {kit.spectrum && (
              <p className="text-xs text-neutral-400">{kit.spectrum}</p>
            )}
            {kit.note && <p className="text-xs text-neutral-500">{kit.note}</p>}
          </div>
        )}

        <Section
          title="Logos"
          hint="Marks, wordmarks and lockups."
          action={
            <PickFiles
              label="Add logos"
              accept="image/*"
              busy={busy === 'logos'}
              onFiles={(files) =>
                runUploads('logos', files, (f, url) =>
                  setKit((k) => ({
                    ...k,
                    logos: [
                      ...k.logos,
                      { label: labelFromFileName(f.name), url },
                    ],
                  })),
                )
              }
            />
          }
        >
          {kit.logos.length ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {kit.logos.map((logo, i) => (
                <div key={`${logo.url}-${i}`} className="group relative">
                  <div
                    style={CHECKER}
                    className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-neutral-900 p-3"
                  >
                    <img
                      src={logo.url}
                      alt={logo.label}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <p className="mt-1 truncate text-xs text-neutral-400">
                    {logo.label}
                  </p>
                  <button
                    type="button"
                    aria-label="Remove logo"
                    onClick={() =>
                      update({ logos: kit.logos.filter((_, j) => j !== i) })
                    }
                    className="absolute right-1.5 top-1.5 hidden size-6 items-center justify-center rounded-full bg-black/70 text-neutral-300 hover:text-white group-hover:flex"
                  >
                    <Icon name="close" className="text-[14px]" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-600">No logos yet.</p>
          )}
        </Section>

        <Section
          title="Colors"
          action={
            <div className="flex items-center gap-1">
              <AdminButton
                size="sm"
                tone="ghost"
                icon="data_object"
                onClick={() => setPasting((p) => !p)}
              >
                Paste colors.json
              </AdminButton>
              <AdminButton
                size="sm"
                tone="ghost"
                icon="add"
                onClick={() =>
                  update({
                    colors: [
                      ...kit.colors,
                      { name: 'New color', hex: '#888888' },
                    ],
                  })
                }
              >
                Add color
              </AdminButton>
            </div>
          }
        >
          {pasting && (
            <div className="flex flex-col gap-2">
              <TextArea
                autoFocus
                rows={5}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder='{"colors":[{"name":"Moon","hex":"#7C3AED","role":"primary"}]}'
                className="font-mono text-xs"
              />
              <div className="flex justify-end">
                <AdminButton size="sm" onClick={applyPastedColors}>
                  Use these colors
                </AdminButton>
              </div>
            </div>
          )}
          {kit.colors.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {kit.colors.map((color, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2"
                >
                  <label
                    className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/10"
                    style={{ backgroundColor: color.hex }}
                  >
                    <input
                      type="color"
                      value={color.hex.slice(0, 7)}
                      onChange={(e) =>
                        update({
                          colors: kit.colors.map((c, j) =>
                            j === i
                              ? { ...c, hex: e.target.value.toUpperCase() }
                              : c,
                          ),
                        })
                      }
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <input
                      value={color.name}
                      onChange={(e) =>
                        update({
                          colors: kit.colors.map((c, j) =>
                            j === i ? { ...c, name: e.target.value } : c,
                          ),
                        })
                      }
                      className="w-full bg-transparent text-sm text-neutral-200 outline-none"
                    />
                    <input
                      value={color.hex}
                      onChange={(e) =>
                        update({
                          colors: kit.colors.map((c, j) =>
                            j === i ? { ...c, hex: e.target.value } : c,
                          ),
                        })
                      }
                      onBlur={() =>
                        update({
                          colors: kit.colors.map((c, j) =>
                            j === i
                              ? { ...c, hex: normalizeHex(c.hex) || '#888888' }
                              : c,
                          ),
                        })
                      }
                      className="w-full bg-transparent font-mono text-xs text-neutral-500 outline-none"
                    />
                    {color.role && (
                      <p
                        className="truncate text-[11px] text-neutral-600"
                        title={color.role}
                      >
                        {color.role}
                      </p>
                    )}
                  </div>
                  <IconAction
                    icon="close"
                    label="Remove color"
                    onClick={() =>
                      update({ colors: kit.colors.filter((_, j) => j !== i) })
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            !pasting && (
              <p className="text-xs text-neutral-600">No colors yet.</p>
            )
          )}
        </Section>

        <Section
          title="Fonts"
          action={
            <PickFiles
              label="Add fonts"
              accept=".ttf,.otf,.woff,.woff2"
              busy={busy === 'fonts'}
              onFiles={(files) =>
                runUploads('fonts', files, (f, url) =>
                  setKit((k) => ({
                    ...k,
                    fonts: [...k.fonts, { ...parseFontFileName(f.name), url }],
                  })),
                )
              }
            />
          }
        >
          {kit.fonts.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {kit.fonts.map((font, i) => (
                <FontRow
                  key={`${font.family}-${font.weight}-${i}`}
                  font={font}
                  onRemove={() =>
                    update({ fonts: kit.fonts.filter((_, j) => j !== i) })
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-600">No fonts yet.</p>
          )}
        </Section>

        <Section
          title="Brand files"
          hint="Intros, outros, banners, guide pages, audio and anything else."
          action={
            <PickFiles
              label="Add files"
              busy={busy === 'files'}
              onFiles={(files) =>
                runUploads('files', files, (f, url) =>
                  setKit((k) => ({
                    ...k,
                    assets: [
                      ...k.assets,
                      {
                        label: labelFromFileName(f.name),
                        url,
                        kind: kindOf(f.name),
                        group: 'other',
                      },
                    ],
                  })),
                )
              }
            />
          }
        >
          {groups.length ? (
            <div className="flex flex-col gap-4">
              {groups.map(([group, items]) => (
                <div key={group} className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    {BRAND_GROUP_LABELS[group] ??
                      group[0].toUpperCase() + group.slice(1)}
                    <span className="ml-1.5 text-neutral-700">
                      {items.length}
                    </span>
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {items.map(({ asset, index }) => (
                      <div
                        key={`${asset.url}-${index}`}
                        className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5"
                      >
                        {asset.kind === 'image' ? (
                          <img
                            src={asset.url}
                            alt=""
                            className="size-8 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span className="flex size-8 shrink-0 items-center justify-center rounded bg-white/[0.05] text-[18px] text-neutral-400">
                            <Icon name={KIND_ICONS[asset.kind]} />
                          </span>
                        )}
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 truncate text-sm text-neutral-300 hover:text-white"
                        >
                          {asset.label}
                        </a>
                        <IconAction
                          icon="close"
                          label="Remove file"
                          onClick={() =>
                            update({
                              assets: kit.assets.filter((_, j) => j !== index),
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-600">No files yet.</p>
          )}
        </Section>

        <Section
          title="Brand guide"
          hint="How to use the brand, in Markdown."
          action={
            <PickFiles
              label="Load .md"
              multiple={false}
              accept=".md,.txt,text/markdown,text/plain"
              onFiles={async ([file]) => update({ guide: await file.text() })}
            />
          }
        >
          <TextArea
            rows={kit.guide ? 10 : 4}
            value={kit.guide ?? ''}
            onChange={(e) => update({ guide: e.target.value })}
            placeholder="Voice, logo spacing, do's and don'ts…"
            className={cn('font-mono text-xs leading-relaxed')}
          />
        </Section>
      </div>
    </AdminModal>
  );
};

/** A compact look at a kit (swatches and counts) that opens the editor. */
export const BrandKitSummary = ({
  kit,
  onOpen,
}: {
  kit?: BrandKit | null;
  onOpen: () => void;
}) => {
  const empty = isBrandKitEmpty(kit);
  const counts = kit
    ? [
        kit.logos.length && `${kit.logos.length} logos`,
        kit.colors.length && `${kit.colors.length} colors`,
        kit.fonts.length && `${kit.fonts.length} fonts`,
        kit.assets.length && `${kit.assets.length} files`,
      ].filter(Boolean)
    : [];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-t border-white/[0.07] px-5 py-3 text-left transition-colors hover:bg-white/[0.02]"
    >
      <Icon name="palette" className="text-[20px] text-neutral-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-neutral-200">Brand kit</p>
        <p className="truncate text-xs text-neutral-500">
          {empty
            ? 'Add logos, colors, fonts and brand files'
            : counts.join(' · ')}
        </p>
      </div>
      {!empty && (
        <div className="flex -space-x-1.5">
          {kit!.colors.slice(0, 6).map((c, i) => (
            <span
              key={i}
              className="size-5 rounded-full border-2 border-neutral-950"
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      )}
      <Icon
        name={empty ? 'add' : 'chevron_right'}
        className="text-[18px] text-neutral-500"
      />
    </button>
  );
};
