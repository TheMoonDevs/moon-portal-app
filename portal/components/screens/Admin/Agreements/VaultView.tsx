'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DOC_TYPES } from '@/lib/agreements/docTypes';
import type { VaultRow } from '@/lib/agreements/vault';
import { cn } from '@/lib/utils';
import { AGREEMENT_STATUS } from '@/models/agreements';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  DateInput,
  EmptyState,
  Icon,
  NativeSelect,
  Panel,
  Pill,
  SearchInput,
  Segmented,
  SkeletonRows,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { day, STATUS_META, waitsOnCompany } from './meta';

/*
 * The document vault: every agreement and onboarding document of the
 * company in one list, searchable down to the words in the text, with the
 * signed PDFs and an export of what the filters show.
 */

export type VaultStatus = 'all' | 'open' | 'company' | 'signed' | 'closed';

const SERVER_STATUS: Record<VaultStatus, string | null> = {
  all: null,
  open: AGREEMENT_STATUS.SENT,
  company: 'WAITING_COMPANY',
  signed: AGREEMENT_STATUS.COMPLETED,
  closed: 'CLOSED',
};

export const matchesStatus = (r: VaultRow, f: VaultStatus) =>
  f === 'all' ||
  (f === 'open' && r.status === AGREEMENT_STATUS.SENT) ||
  (f === 'company' && waitsOnCompany(r)) ||
  (f === 'signed' && r.status === AGREEMENT_STATUS.COMPLETED) ||
  (f === 'closed' &&
    r.status !== AGREEMENT_STATUS.SENT &&
    r.status !== AGREEMENT_STATUS.COMPLETED);

/** One document in a list: opens it, with its PDF once signed. */
export const DocRow = ({
  row,
  onOpen,
  hidePeople,
}: {
  row: VaultRow;
  onOpen: (row: VaultRow) => void;
  hidePeople?: boolean;
}) => {
  const meta = STATUS_META[row.status];
  const parties = row.signers.filter((s) => !s.company);
  const company = row.signers.find((s) => s.company);
  const forCompany = waitsOnCompany(row);
  return (
    <li className="flex items-center gap-2 pr-3 transition-colors hover:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => onOpen(row)}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[18px] text-neutral-400">
          <Icon
            name={row.source === 'onboarding' ? 'how_to_reg' : 'description'}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
            <span className="truncate">{row.title}</span>
            {row.confidential && (
              <span title="Confidential: HR and owners only">
                <Icon name="lock" className="text-[14px] text-amber-300/80" />
              </span>
            )}
          </p>
          <p className="truncate text-xs text-neutral-500">
            {!hidePeople && parties.length > 0 && (
              <>{parties.map((s) => s.name).join(', ')} · </>
            )}
            sent {day(row.sentAt)}
            {company
              ? ` · ${company.name} for the company${company.signedAt ? (company.saved ? ' (approved)' : ' (signed)') : ''}`
              : ''}
            {row.source === 'onboarding' ? ' · from onboarding' : ''}
          </p>
        </div>
        <Pill className="hidden md:inline-flex">{row.typeLabel}</Pill>
        <span className="hidden w-16 text-right text-xs text-neutral-500 sm:block">
          {row.progress.signed}/{row.progress.total} signed
        </span>
        {forCompany ? (
          <Pill tone="purple" icon="approval">
            Company to sign
          </Pill>
        ) : (
          <Pill tone={meta.tone} icon={meta.icon}>
            {meta.label}
          </Pill>
        )}
      </button>
      {row.pdfUrl ? (
        <a
          href={row.pdfUrl}
          title={
            row.status === AGREEMENT_STATUS.COMPLETED
              ? 'Signed PDF'
              : 'PDF as signed so far'
          }
          aria-label="Download the PDF"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white"
        >
          <Icon name="download" className="text-[18px]" />
        </a>
      ) : (
        <span className="size-8 shrink-0" />
      )}
    </li>
  );
};

/** Turns filters into the query the vault and its exports take. */
export const vaultQuery = (
  companyId: string,
  f: {
    q?: string;
    type?: string;
    person?: string;
    from?: string;
    to?: string;
    status?: VaultStatus;
  },
) => {
  const p = new URLSearchParams({ companyId });
  if (f.q?.trim()) p.set('q', f.q.trim());
  if (f.type) p.set('type', f.type);
  if (f.person) p.set('person', f.person);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  const status = f.status ? SERVER_STATUS[f.status] : null;
  if (status) p.set('status', status);
  return p.toString();
};

export const VaultView = ({
  companyId,
  refreshKey,
  onOpen,
  canCreate,
  onSend,
}: {
  companyId: string;
  /** Changes when something was sent or changed, to load again. */
  refreshKey: number;
  onOpen: (row: VaultRow) => void;
  canCreate: boolean;
  onSend: () => void;
}) => {
  const [rows, setRows] = useState<VaultRow[] | null>(null);
  const [status, setStatus] = useState<VaultStatus>('all');
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [person, setPerson] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Words search the text of every document too, so they go to the server.
  useEffect(() => {
    const t = setTimeout(() => setQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let live = true;
    PortalSdk.getData(
      `/api/documents?${vaultQuery(companyId, { q, type, person, from, to })}`,
      null,
    )
      .then((res) => live && setRows(res?.data?.documents ?? []))
      .catch((err) => {
        if (!live) return;
        setRows([]);
        toast.error(errorText(err));
      });
    return () => {
      live = false;
    };
  }, [companyId, q, type, person, from, to, refreshKey]);

  // Everyone in the documents shown, to filter by.
  const [people, setPeople] = useState<Array<{ key: string; name: string }>>(
    [],
  );
  useEffect(() => {
    if (!rows || person) return;
    const seen = new Map<string, string>();
    for (const r of rows)
      for (const p of r.people)
        if (p.email && !seen.has(p.email.toLowerCase()))
          seen.set(p.email.toLowerCase(), p.name);
    setPeople(
      Array.from(seen, ([key, name]) => ({ key, name })).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
  }, [rows, person]);

  const shown = useMemo(
    () => (rows ?? []).filter((r) => matchesStatus(r, status)),
    [rows, status],
  );
  const count = (f: VaultStatus) =>
    (rows ?? []).filter((r) => matchesStatus(r, f)).length;
  const filtered = !!(q || type || person || from || to);
  const exportQuery = vaultQuery(companyId, {
    q,
    type,
    person,
    from,
    to,
    status,
  });

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All', count: count('all') },
              { value: 'open', label: 'Out for signing', count: count('open') },
              {
                value: 'company',
                label: 'Company to sign',
                count: count('company'),
              },
              { value: 'signed', label: 'Signed', count: count('signed') },
              { value: 'closed', label: 'Closed', count: count('closed') },
            ]}
          />
          <div className="flex-1" />
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Title, person or any words in it"
            className="w-full sm:w-72"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-8 w-auto text-xs"
          >
            <option value="">All types</option>
            <optgroup label="Onboarding">
              {DOC_TYPES.filter((t) => t.group === 'onboarding').map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Agreements">
              {DOC_TYPES.filter((t) => t.group === 'agreements').map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </NativeSelect>
          <NativeSelect
            aria-label="Person"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            className="h-8 w-auto max-w-[220px] text-xs"
          >
            <option value="">Everyone</option>
            {people.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            Sent
            <DateInput
              aria-label="Sent from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
            to
            <DateInput
              aria-label="Sent until"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
          </span>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setType('');
                setPerson('');
                setFrom('');
                setTo('');
              }}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Clear
            </button>
          )}
          <div className="flex-1" />
          <a
            href={`/api/documents/export?${exportQuery}&format=csv`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-neutral-300 hover:bg-white/[0.06] hover:text-white"
          >
            <Icon name="table_view" className="text-[16px]" />
            Spreadsheet
          </a>
          <a
            href={`/api/documents/export?${exportQuery}&format=zip`}
            title="The signed PDFs of what's shown, up to 150, with an index"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-neutral-300 hover:bg-white/[0.06] hover:text-white"
          >
            <Icon name="folder_zip" className="text-[16px]" />
            PDFs
          </a>
        </div>
      </div>
      {!rows ? (
        <SkeletonRows rows={4} />
      ) : !shown.length ? (
        <EmptyState
          icon="signature"
          title={
            rows.length || filtered ? 'Nothing matches' : 'No documents yet'
          }
          description={
            rows.length || filtered
              ? undefined
              : 'Send an NDA, a contractor or client agreement, or any document that needs a signature. Onboarding documents land here too.'
          }
          action={
            !rows.length && !filtered && canCreate ? (
              <AdminButton size="sm" icon="send" onClick={onSend}>
                Send the first one
              </AdminButton>
            ) : undefined
          }
        />
      ) : (
        <ul className={cn('divide-y divide-white/[0.05]')}>
          {shown.map((r) => (
            <DocRow key={r.id} row={r} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </Panel>
  );
};
