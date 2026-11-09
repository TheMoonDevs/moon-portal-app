'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type {
  companyLetters,
  draftLetter,
  LetterStatus,
} from '@/lib/agreements/letters';
import type { vaultPeople } from '@/lib/agreements/vault';
import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Paper } from '../Onboarding/OnboardingDialogs';
import {
  AdminButton,
  AdminModal,
  EmptyState,
  Field,
  Icon,
  NativeSelect,
  Panel,
  Pill,
  type PillTone,
  Segmented,
  SkeletonRows,
  TextArea,
  TextInput,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { day } from './meta';

/*
 * Letters on request: experience, relieving, salary and address letters
 * and employment certificates people ask for from their documents. HR or
 * an owner checks the draft (filled from the person's record), approves
 * it, and the company's signatory signs it; the signed letter lands in
 * the person's documents and their inbox.
 */

type LettersData = Awaited<ReturnType<typeof companyLetters>>;
type LetterRow = LettersData['requests'][number];
type Draft = Awaited<ReturnType<typeof draftLetter>>;
type Person = Awaited<ReturnType<typeof vaultPeople>>[number];

export const LETTER_STATUS: Record<
  LetterStatus,
  { label: string; tone: PillTone; icon: string }
> = {
  REQUESTED: { label: 'To review', tone: 'warning', icon: 'pending_actions' },
  SIGNING: { label: 'Being signed', tone: 'info', icon: 'draw' },
  READY: { label: 'Sent to them', tone: 'positive', icon: 'task_alt' },
  NOT_SIGNED: { label: 'Not signed', tone: 'danger', icon: 'error' },
  DECLINED: { label: 'Declined', tone: 'neutral', icon: 'block' },
  CANCELLED: { label: 'Withdrawn', tone: 'neutral', icon: 'undo' },
};

const OPEN: LetterStatus[] = ['REQUESTED', 'SIGNING', 'NOT_SIGNED'];

const longToday = () =>
  new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

/** The letter as it will read, for the preview beside the form. */
const fillLetter = (
  body: string,
  values: Record<string, string>,
  companyName: string,
) => {
  const purpose = values.forPurpose?.trim();
  const vars: Record<string, string> = {
    ...values,
    companyName,
    today: longToday(),
  };
  return body
    .replaceAll('{{forPurpose}}', purpose ? ` ${purpose}` : '')
    .replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k]?.trim() || m);
};

/* ------------------------------ the draft -------------------------------- */

const DraftDialog = ({
  id,
  companyName,
  onClose,
  onDone,
}: {
  id: string | null;
  companyName: string;
  onClose: () => void;
  onDone: () => void;
}) => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);

  useEffect(() => {
    if (!id) return;
    setDraft(null);
    setEditing(false);
    setDeclining(false);
    setReason('');
    PortalSdk.postData('/api/agreements/letters', { action: 'draft', id })
      .then((res) => {
        const d: Draft = res.data;
        setDraft(d);
        setBody(d.body);
        setValues(Object.fromEntries(d.blanks.map((b) => [b.key, b.value])));
      })
      .catch((err) => {
        toast.error(errorText(err));
        onClose();
      });
  }, [id, onClose]);

  const missing = (draft?.blanks ?? []).filter(
    (b) => !b.optional && !values[b.key]?.trim(),
  );
  const preview = useMemo(
    () => fillLetter(body, values, companyName),
    [body, values, companyName],
  );
  const r = draft?.request;
  const closed = r && (r.status === 'SIGNING' || r.status === 'READY');

  const approve = async (sign: boolean) => {
    if (!draft || !r) return;
    setBusy('approve');
    try {
      const res = await PortalSdk.postData('/api/agreements/letters', {
        action: 'approve',
        id: r.id,
        values,
        body: body !== draft.body ? body : undefined,
        sign,
      });
      toast.success(
        res.data.signed
          ? `Signed. ${r.person.name} has it by email and in their documents.`
          : `Approved. ${draft.signatory?.name ?? 'The signatory'} signs it next, then ${r.person.name} gets it.`,
      );
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    if (!r) return;
    setBusy('decline');
    try {
      await PortalSdk.postData('/api/agreements/letters', {
        action: 'decline',
        id: r.id,
        reason,
      });
      toast.success(`Declined. ${r.person.name} has been told why.`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminModal
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      title={r ? `${r.label} for ${r.person.name}` : 'Letter'}
      description={
        draft
          ? closed
            ? 'This letter is already out for signing or sent.'
            : 'Filled from their Portal record. Check each detail before it is signed.'
          : undefined
      }
      icon="contract"
      size="lg"
      footer={
        draft &&
        !closed &&
        (declining ? (
          <>
            <AdminButton
              size="sm"
              tone="ghost"
              onClick={() => setDeclining(false)}
            >
              Back
            </AdminButton>
            <AdminButton
              size="sm"
              tone="danger"
              icon="block"
              loading={busy === 'decline'}
              onClick={decline}
            >
              Decline the request
            </AdminButton>
          </>
        ) : (
          <>
            {r?.status === 'REQUESTED' && (
              <AdminButton
                size="sm"
                tone="ghost"
                icon="block"
                onClick={() => setDeclining(true)}
              >
                Decline
              </AdminButton>
            )}
            <div className="flex-1" />
            {missing.length > 0 && (
              <span className="text-xs text-amber-300">
                Fill in {missing.map((m) => m.label.toLowerCase()).join(', ')}
              </span>
            )}
            {draft.canSignNow ? (
              <AdminButton
                size="sm"
                tone="primary"
                icon="signature"
                loading={busy === 'approve'}
                disabled={missing.length > 0}
                onClick={() => approve(true)}
              >
                Sign and send
              </AdminButton>
            ) : (
              <AdminButton
                size="sm"
                tone="primary"
                icon="send"
                loading={busy === 'approve'}
                disabled={missing.length > 0}
                onClick={() => approve(false)}
              >
                {draft.signatory
                  ? `Approve, ${draft.signatory.name.split(' ')[0]} signs`
                  : 'Approve'}
              </AdminButton>
            )}
          </>
        ))
      }
    >
      {!draft || !r ? (
        <SkeletonRows rows={4} />
      ) : declining ? (
        <Field
          label="Why it can’t be issued"
          hint={`${r.person.name} reads this in the email and in their documents.`}
        >
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="For example: a relieving letter is issued after the last working day."
          />
        </Field>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill
              tone={LETTER_STATUS[r.status].tone}
              icon={LETTER_STATUS[r.status].icon}
            >
              {LETTER_STATUS[r.status].label}
            </Pill>
            {draft.confidential && (
              <Pill tone="warning" icon="lock">
                HR and owners
              </Pill>
            )}
            <span className="text-xs text-neutral-500">
              Asked {day(r.requestedAt)}
              {r.neededBy ? ` · needed by ${day(r.neededBy)}` : ''}
              {draft.signatory
                ? ` · signed by ${draft.signatory.name} for ${companyName}`
                : ''}
            </span>
          </div>
          {r.note && (
            <p className="flex items-start gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-neutral-300">
              <Icon
                name="chat"
                className="mt-px text-[15px] text-neutral-500"
              />
              {r.note}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {draft.blanks.map((b) => {
              const fromRecord =
                b.value && b.key !== 'addressedTo' && b.key !== 'forPurpose';
              return (
                <Field
                  key={b.key}
                  label={b.label}
                  required={!b.optional}
                  hint={
                    b.key === 'forPurpose'
                      ? 'Optional, as they asked: “for a visa application”.'
                      : fromRecord
                        ? 'From their record. Type to change it.'
                        : !b.value
                          ? 'Not in their record.'
                          : undefined
                  }
                  className={b.key === 'address' ? 'sm:col-span-2' : undefined}
                >
                  <TextInput
                    value={values[b.key] ?? ''}
                    disabled={!!closed}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [b.key]: e.target.value }))
                    }
                  />
                </Field>
              );
            })}
          </div>
          {!closed && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="flex items-center gap-1.5 self-start text-xs font-medium text-neutral-400 hover:text-white"
            >
              <Icon
                name={editing ? 'expand_less' : 'edit_note'}
                className="text-[16px]"
              />
              {editing ? 'Hide the wording' : 'Change the wording for this one'}
            </button>
          )}
          {editing && (
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[220px] font-mono text-[13px]"
            />
          )}
          <Paper body={preview} />
        </div>
      )}
    </AdminModal>
  );
};

/* ------------------------------ write one -------------------------------- */

const StartDialog = ({
  open,
  companyId,
  kinds,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  companyId: string;
  kinds: LettersData['kinds'];
  onOpenChange: (open: boolean) => void;
  onStarted: (id: string) => void;
}) => {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [userId, setUserId] = useState('');
  const [kind, setKind] = useState('');
  const [purpose, setPurpose] = useState('');
  const [addressedTo, setAddressedTo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUserId('');
    setKind(kinds[0]?.kind ?? '');
    setPurpose('');
    setAddressedTo('');
    if (people) return;
    PortalSdk.getData(`/api/documents/people?companyId=${companyId}`, null)
      .then((res) => setPeople(res?.data?.people ?? []))
      .catch((err) => {
        setPeople([]);
        toast.error(errorText(err));
      });
  }, [open, companyId, kinds, people]);

  useEffect(() => setPeople(null), [companyId]);

  const start = async () => {
    setBusy(true);
    try {
      const res = await PortalSdk.postData('/api/agreements/letters', {
        action: 'start',
        companyId,
        userId,
        kind,
        purpose,
        addressedTo,
      });
      onOpenChange(false);
      onStarted(res.data.request.id);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title="Write a letter"
      description="For someone who asked outside the Portal. You check the draft next."
      icon="contract_edit"
      size="md"
      footer={
        <AdminButton
          size="sm"
          tone="primary"
          icon="arrow_forward"
          loading={busy}
          disabled={!userId || !kind}
          onClick={start}
        >
          Draft it
        </AdminButton>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="For" required>
          <NativeSelect
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={!people}
          >
            <option value="">{people ? 'Pick a person' : 'Loading…'}</option>
            {(people ?? []).map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.name}
                {p.title ? ` · ${p.title}` : ''}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Letter"
          required
          hint={kinds.find((k) => k.kind === kind)?.hint}
        >
          <NativeSelect value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinds.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Purpose" hint="Optional: “for a visa application”.">
            <TextInput
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </Field>
          <Field label="Addressed to" hint="Optional: a bank, an embassy.">
            <TextInput
              value={addressedTo}
              onChange={(e) => setAddressedTo(e.target.value)}
            />
          </Field>
        </div>
      </div>
    </AdminModal>
  );
};

/* -------------------------------- the list -------------------------------- */

export const LettersView = ({
  companyId,
  companyName,
  refreshKey,
  openLetterId,
  onOpenAgreement,
  onChanged,
}: {
  companyId: string;
  companyName: string;
  refreshKey: number;
  /** Opened from the email HR gets: ?letter=<id>. */
  openLetterId: string | null;
  onOpenAgreement: (id: string) => void;
  onChanged: () => void;
}) => {
  const [data, setData] = useState<LettersData | null>(null);
  const [show, setShow] = useState<'open' | 'all'>('open');
  const [drafting, setDrafting] = useState<string | null>(openLetterId);
  const [starting, setStarting] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setData(null);
    PortalSdk.getData(`/api/agreements/letters?companyId=${companyId}`, null)
      .then((res) => setData(res?.data ?? null))
      .catch((err) => {
        toast.error(errorText(err));
        setData({ requests: [], open: 0, kinds: [] });
      });
  }, [companyId, refreshKey, reload]);

  useEffect(() => {
    if (openLetterId) setDrafting(openLetterId);
  }, [openLetterId]);

  const done = useCallback(() => {
    setReload((k) => k + 1);
    onChanged();
  }, [onChanged]);
  const closeDraft = useCallback(() => setDrafting(null), []);

  const rows = (data?.requests ?? []).filter(
    (r) => show === 'all' || OPEN.includes(r.status),
  );

  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-wrap items-center gap-3 p-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-[22px] text-violet-300">
          <Icon name="contract" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">
            {data
              ? data.open
                ? `${data.open} ${data.open === 1 ? 'letter' : 'letters'} to review`
                : 'No letters waiting'
              : 'Letters'}
          </p>
          <p className="text-xs text-neutral-500">
            People ask from their documents. You check the draft, the company
            signs, and it lands in their documents and inbox.
          </p>
        </div>
        <Segmented
          value={show}
          onChange={setShow}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'all', label: 'All' },
          ]}
        />
        <AdminButton icon="contract_edit" onClick={() => setStarting(true)}>
          Write a letter
        </AdminButton>
      </Panel>

      {!data ? (
        <SkeletonRows rows={3} />
      ) : !rows.length ? (
        <EmptyState
          icon="contract"
          title={show === 'open' ? 'Nothing to review' : 'No letters yet'}
          description="When someone asks for an experience, relieving, salary or address letter, it shows here."
        />
      ) : (
        <Panel className="divide-y divide-white/[0.05]">
          {rows.map((r: LetterRow) => {
            const meta = LETTER_STATUS[r.status];
            return (
              <div
                key={r.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-white">
                    <span className="font-medium">{r.label}</span>
                    <span className="text-neutral-500">·</span>
                    {r.person.name}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {[
                      r.purpose,
                      r.addressedTo && `To ${r.addressedTo}`,
                      `asked ${day(r.requestedAt)}`,
                      r.neededBy && `needed by ${day(r.neededBy)}`,
                      r.status === 'SIGNING' &&
                        r.waitingOn &&
                        `waiting on ${r.waitingOn}`,
                      r.status === 'DECLINED' && r.declineReason,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={meta.tone} icon={meta.icon}>
                    {meta.label}
                  </Pill>
                  {(r.status === 'REQUESTED' || r.status === 'NOT_SIGNED') && (
                    <AdminButton
                      size="sm"
                      tone={r.status === 'REQUESTED' ? 'primary' : 'secondary'}
                      onClick={() => setDrafting(r.id)}
                    >
                      {r.status === 'REQUESTED' ? 'Review' : 'Review again'}
                    </AdminButton>
                  )}
                  {r.agreementId && r.status !== 'REQUESTED' && (
                    <AdminButton
                      size="sm"
                      tone="ghost"
                      icon="open_in_new"
                      onClick={() => onOpenAgreement(r.agreementId!)}
                    >
                      Open
                    </AdminButton>
                  )}
                  {r.pdfUrl && (
                    <a
                      href={r.pdfUrl}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-neutral-100 hover:bg-white/[0.09]',
                      )}
                    >
                      <Icon name="download" className="text-[16px]" />
                      PDF
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </Panel>
      )}

      <DraftDialog
        id={drafting}
        companyName={companyName}
        onClose={closeDraft}
        onDone={done}
      />
      <StartDialog
        open={starting}
        companyId={companyId}
        kinds={data?.kinds ?? []}
        onOpenChange={setStarting}
        onStarted={(id) => {
          done();
          setDrafting(id);
        }}
      />
    </div>
  );
};
