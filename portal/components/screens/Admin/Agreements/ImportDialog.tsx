'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { DOC_TYPES } from '@/lib/agreements/docTypes';
import type { SettingsView } from '@/lib/agreements/signers';
import type { vaultPeople } from '@/lib/agreements/vault';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  DateInput,
  Field,
  Icon,
  NativeSelect,
  TextInput,
  ToggleSwitch,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';

/*
 * Import a document signed before the Portal (a scanned NDA, an old offer
 * letter): the PDF goes straight to storage, then it's filed under the
 * person, in the vault and in their own documents, like any signed one.
 */

type Person = Awaited<ReturnType<typeof vaultPeople>>[number];

const MAX_MB = 20;
const OUTSIDE = '__outside__';

export const ImportDialog = ({
  open,
  onOpenChange,
  companyId,
  settings,
  forPerson,
  onImported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  settings: SettingsView | null;
  /** Opened from a person's file: theirs. */
  forPerson?: string | null;
  onImported: () => void;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [typeKey, setTypeKey] = useState('NDA');
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [signedOn, setSignedOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [note, setNote] = useState('');
  const [confidential, setConfidential] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setTitle('');
    setTypeKey('NDA');
    setUserId(forPerson ?? '');
    setName('');
    setEmail('');
    setSignedOn('');
    setEndsOn('');
    setNote('');
    setConfidential(null);
    PortalSdk.getData(`/api/documents/people?companyId=${companyId}`, null)
      .then((res) => setPeople(res?.data?.people ?? []))
      .catch(() => setPeople([]));
  }, [open, companyId, forPerson]);

  const typeConfidential = !!settings?.types[typeKey]?.confidential;
  const isConfidential = confidential ?? typeConfidential;
  const outside = userId === OUTSIDE;
  const ready =
    !!file &&
    !!title.trim() &&
    !!signedOn &&
    (outside ? !!name.trim() : !!userId);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') return toast.error('Pick a PDF.');
    if (f.size > MAX_MB * 1024 * 1024)
      return toast.error(`PDFs can be up to ${MAX_MB} MB.`);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '));
  };

  const save = async () => {
    if (!file) return;
    try {
      setBusy('Uploading…');
      const up = await PortalSdk.postData('/api/documents/imports', {
        action: 'upload',
        companyId,
        name: file.name,
        size: file.size,
        mime: file.type,
      });
      const put = await fetch(up.data.url, {
        method: 'PUT',
        headers: up.data.headers,
        body: file,
      });
      if (!put.ok) throw new Error('The upload failed. Try again.');
      setBusy('Filing it…');
      await PortalSdk.postData('/api/documents/imports', {
        action: 'register',
        companyId,
        key: up.data.key,
        title,
        typeKey,
        ...(outside
          ? { personName: name, personEmail: email || null }
          : { userId }),
        signedOn,
        endsOn: endsOn || null,
        confidential,
        note,
      });
      toast.success('Imported. It’s in the vault and their file.');
      onImported();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title="Import a signed document"
      description="A PDF signed on paper or elsewhere, filed with everything else."
      icon="upload_file"
      footer={
        <AdminButton
          size="sm"
          tone="primary"
          icon="upload"
          loading={!!busy}
          disabled={!ready}
          onClick={save}
        >
          {busy ?? 'Import'}
        </AdminButton>
      }
    >
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center hover:border-white/30 hover:bg-white/[0.04]"
        >
          <Icon
            name={file ? 'picture_as_pdf' : 'upload_file'}
            className="text-[28px] text-neutral-400"
          />
          <span className="text-sm text-neutral-200">
            {file ? file.name : 'Drop a PDF here, or pick one'}
          </span>
          <span className="text-xs text-neutral-500">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(1)} MB · pick another`
              : `Up to ${MAX_MB} MB`}
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" required>
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Kind">
            <NativeSelect
              value={typeKey}
              onChange={(e) => setTypeKey(e.target.value)}
            >
              {DOC_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Whose document" required>
          <NativeSelect
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="" disabled>
              Pick a person
            </option>
            {people.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.name}
                {p.email ? ` · ${p.email}` : ''}
              </option>
            ))}
            <option value={OUTSIDE}>
              Someone outside the Portal (a client)
            </option>
          </NativeSelect>
        </Field>
        {outside && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Their name" required>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Their email">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Signed on" required>
            <DateInput
              value={signedOn}
              onChange={(e) => setSignedOn(e.target.value)}
            />
          </Field>
          <Field
            label="Ends on"
            hint="Optional. You hear 30 and 7 days before."
          >
            <DateInput
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Note">
          <TextInput
            value={note}
            placeholder="e.g. Original in the office file"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <ToggleSwitch
          checked={isConfidential}
          onChange={setConfidential}
          label="Confidential"
          description={
            isConfidential
              ? 'Only HR, owners and the person it belongs to see it.'
              : 'Everyone who can see agreements sees it.'
          }
        />
      </div>
    </AdminModal>
  );
};
