'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { personFile, vaultPeople, VaultRow } from '@/lib/agreements/vault';
import { cn } from '@/lib/utils';
import type { AGREEMENT_CATEGORY } from '@/models/agreements';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  EmptyState,
  Icon,
  Panel,
  Pill,
  SearchInput,
  SkeletonRows,
  UserAvatar,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { day } from './meta';
import { DocRow } from './VaultView';

/*
 * Each person's file: everything they signed or still have to, what's
 * missing (no NDA on file), and their whole file as one download.
 */

type Person = Awaited<ReturnType<typeof vaultPeople>>[number];
type PersonFile = Awaited<ReturnType<typeof personFile>>;

export const PeopleView = ({
  companyId,
  refreshKey,
  onOpen,
  canCreate,
  onSend,
}: {
  companyId: string;
  refreshKey: number;
  onOpen: (row: VaultRow) => void;
  canCreate: boolean;
  /** Send this person an agreement, optionally of one kind. */
  onSend: (
    to: { name: string; email: string },
    category?: AGREEMENT_CATEGORY,
  ) => void;
}) => {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<PersonFile | null>(null);

  useEffect(() => {
    setPeople(null);
    PortalSdk.getData(`/api/documents/people?companyId=${companyId}`, null)
      .then((res) => setPeople(res?.data?.people ?? []))
      .catch((err) => {
        setPeople([]);
        toast.error(errorText(err));
      });
  }, [companyId, refreshKey]);

  useEffect(() => {
    if (!selected) return setFile(null);
    setFile(null);
    PortalSdk.getData(
      `/api/documents/people?companyId=${companyId}&userId=${selected}`,
      null,
    )
      .then((res) => setFile(res?.data?.file ?? null))
      .catch((err) => {
        toast.error(errorText(err));
        setSelected(null);
      });
  }, [companyId, selected, refreshKey]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (people ?? []).filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        (p.title ?? '').toLowerCase().includes(q),
    );
  }, [people, query]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Panel className={cn(selected && 'max-lg:hidden')}>
        <div className="border-b border-white/[0.07] p-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Find a person"
            className="w-full"
          />
        </div>
        {!people ? (
          <SkeletonRows rows={5} />
        ) : !shown.length ? (
          <EmptyState icon="group" title="Nobody matches" />
        ) : (
          <ul className="max-h-[640px] divide-y divide-white/[0.05] overflow-y-auto">
            {shown.map((p) => (
              <li key={p.userId}>
                <button
                  type="button"
                  onClick={() => setSelected(p.userId)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]',
                    selected === p.userId && 'bg-white/[0.05]',
                  )}
                >
                  <UserAvatar src={p.avatar} name={p.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {p.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {p.title ?? p.email}
                    </p>
                  </div>
                  <span className="text-right text-[11px] leading-tight text-neutral-500">
                    {p.signed} signed
                    {p.waiting > 0 && (
                      <span className="block text-amber-300/90">
                        {p.waiting} waiting
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className={cn('min-w-0', !selected && 'max-lg:hidden')}>
        {!selected ? (
          <Panel>
            <EmptyState
              icon="folder_shared"
              title="Pick a person"
              description="Their file has every document they signed or still have to, and what's missing."
            />
          </Panel>
        ) : !file ? (
          <Panel>
            <SkeletonRows rows={4} />
          </Panel>
        ) : (
          <Panel>
            <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] p-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Back to people"
                className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white lg:hidden"
              >
                <Icon name="arrow_back" className="text-[18px]" />
              </button>
              <UserAvatar
                src={file.person.avatar}
                name={file.person.name}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">
                  {file.person.name}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {[
                    file.person.title,
                    file.person.email,
                    file.person.joinedAt &&
                      `joined ${day(file.person.joinedAt)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {file.documents.some((d) => d.pdfUrl) && (
                <a
                  href={`/api/documents/export?companyId=${companyId}&person=${file.person.userId}&format=zip`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-neutral-100 hover:bg-white/[0.09]"
                >
                  <Icon name="folder_zip" className="text-[16px]" />
                  Download their file
                </a>
              )}
              {canCreate && file.person.email && (
                <AdminButton
                  size="sm"
                  tone="primary"
                  icon="send"
                  onClick={() =>
                    onSend({
                      name: file.person.name,
                      email: file.person.email!,
                    })
                  }
                >
                  Send them one
                </AdminButton>
              )}
            </div>

            {file.requirements.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.07] px-4 py-3">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Required
                </span>
                {file.requirements.map((q) => (
                  <Pill
                    key={q.id}
                    tone={
                      q.state === 'signed'
                        ? 'positive'
                        : q.state === 'waiting'
                          ? 'warning'
                          : 'danger'
                    }
                    icon={
                      q.state === 'signed'
                        ? 'task_alt'
                        : q.state === 'waiting'
                          ? 'pending'
                          : 'error'
                    }
                  >
                    {q.label}
                  </Pill>
                ))}
              </div>
            )}

            {(file.missing.length > 0 || file.hiddenConfidential > 0) && (
              <div className="flex flex-col gap-2 border-b border-white/[0.07] p-4">
                {file.missing.map((m) => (
                  <div
                    key={m.key}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-sm text-amber-100"
                  >
                    <Icon
                      name="warning"
                      className="text-[18px] text-amber-300"
                    />
                    <span className="flex-1">{m.why}</span>
                    {!m.sendable && (
                      <span className="text-xs text-amber-200/60">
                        Sent through onboarding
                      </span>
                    )}
                    {canCreate && file.person.email && m.sendable && (
                      <AdminButton
                        size="sm"
                        tone="secondary"
                        onClick={() =>
                          onSend(
                            {
                              name: file.person.name,
                              email: file.person.email!,
                            },
                            (m.category ?? undefined) as
                              | AGREEMENT_CATEGORY
                              | undefined,
                          )
                        }
                      >
                        Send it
                      </AdminButton>
                    )}
                  </div>
                ))}
                {file.hiddenConfidential > 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Icon name="lock" className="text-[14px]" />
                    {file.hiddenConfidential} confidential{' '}
                    {file.hiddenConfidential === 1 ? 'document' : 'documents'}{' '}
                    (pay) not shown. Only HR and owners see them.
                  </p>
                )}
              </div>
            )}

            {!file.documents.length ? (
              <EmptyState
                icon="description"
                title="No documents yet"
                description="Documents they sign, from onboarding or the Agreements tab, show up here."
              />
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {file.documents.map((r) => (
                  <DocRow key={r.id} row={r} onOpen={onOpen} hidePeople />
                ))}
              </ul>
            )}
            {file.waitingOnThem.length > 0 && (
              <p className="border-t border-white/[0.07] px-4 py-2.5 text-xs text-neutral-500">
                <Pill tone="warning" className="mr-2">
                  {file.waitingOnThem.length}
                </Pill>
                waiting for their signature.
              </p>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
};
