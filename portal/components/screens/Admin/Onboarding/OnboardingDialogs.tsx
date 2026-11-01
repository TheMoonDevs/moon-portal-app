'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DocProse } from '@/components/shared/DocProse';
import { fillDocument } from '@/lib/onboarding/documents';
import {
  addDays,
  AGREEMENT_DOCS,
  CURRENCIES,
  DOC_LABEL,
  formatDay,
  formatMoney,
  OFFER_DOCS,
  todayIst,
  TRIAL_DAYS,
  trialPayFor,
} from '@/lib/onboarding/meta';
import { cn } from '@/lib/utils';
import {
  HIRE_TYPE,
  type ONBOARDING_DOC_KIND,
  ONBOARDING_STEP,
} from '@/models/onboarding';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  CheckBox,
  DateInput,
  Field,
  Icon,
  NativeSelect,
  Pill,
  Segmented,
  TextArea,
  TextInput,
  UserAvatar,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import {
  type BoardData,
  type DocTemplate,
  type Hire,
  previewVariables,
  type ReadyApplicant,
  startingTerms,
  type TermsDraft,
  termsDraftOf,
  termsPayload,
} from './onboardingClient';

/* --------------------------------- shared --------------------------------- */

/** Loads the company's document templates once per dialog. */
const useTemplates = (companyId: string, open: boolean) => {
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  useEffect(() => {
    if (!open) return;
    PortalSdk.getData(`/api/onboarding/templates?companyId=${companyId}`, null)
      .then((res) => setTemplates(res?.data?.templates ?? []))
      .catch(() => setTemplates([]));
  }, [companyId, open]);
  return templates;
};

/** A white sheet, the way the hire will read it. */
export const Paper = ({
  title,
  body,
  footer,
  className,
}: {
  title?: string;
  body: string;
  footer?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'rounded-xl bg-white px-6 py-7 shadow-xl shadow-black/40 sm:px-9',
      className,
    )}
  >
    {title && (
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {title}
      </p>
    )}
    <DocProse markdown={body} tone="paper" />
    {footer}
  </div>
);

/** Live documents for the terms being typed, one tab per document. */
const LivePreview = ({
  kinds,
  templates,
  vars,
}: {
  kinds: ONBOARDING_DOC_KIND[];
  templates: DocTemplate[];
  vars: Record<string, string>;
}) => {
  const [kind, setKind] = useState(kinds[0]);
  const template = templates.find((t) => t.kind === kind);
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <Segmented
        value={kind}
        onChange={setKind}
        options={kinds.map((k) => ({ value: k, label: DOC_LABEL[k] }))}
      />
      <div className="custom-scrollbar max-h-[56vh] overflow-y-auto rounded-xl bg-neutral-800/40 p-3">
        {template ? (
          <Paper
            body={fillDocument(template.body, vars).replace(/\n{3,}/g, '\n\n')}
            className="text-[13px]"
          />
        ) : (
          <p className="p-6 text-center text-sm text-neutral-500">Loading…</p>
        )}
      </div>
    </div>
  );
};

/** What the trial pays, worked out while the lead types. */
const PaySummary = ({ terms }: { terms: TermsDraft }) => {
  const pay = Number(terms.monthlyPay) || 0;
  const trial = trialPayFor(pay, terms.hireType, terms.currency);
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-center">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-neutral-500">
          Trial
        </p>
        <p className="text-sm font-semibold text-white">{trial.days} days</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-neutral-500">
          If confirmed
        </p>
        <p className="text-sm font-semibold text-emerald-300">
          {pay ? formatMoney(trial.full, terms.currency) : '—'}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-neutral-500">
          If it ends
        </p>
        <p className="text-sm font-semibold text-amber-300">
          {pay ? formatMoney(trial.half, terms.currency) : '—'}
        </p>
      </div>
    </div>
  );
};

/** The agreement terms: what the Trial Policy and NDA are written from. */
export const TermsFields = ({
  board,
  terms,
  onChange,
}: {
  board: BoardData;
  terms: TermsDraft;
  onChange: (terms: TermsDraft) => void;
}) => {
  const set = <K extends keyof TermsDraft>(key: K, value: TermsDraft[K]) =>
    onChange({ ...terms, [key]: value });
  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Hire type"
        hint={`Interns have a ${TRIAL_DAYS.INTERN}-day trial, full-time hires ${TRIAL_DAYS.FULL_TIME} days.`}
      >
        <Segmented
          value={terms.hireType}
          onChange={(v) => set('hireType', v)}
          options={[
            { value: HIRE_TYPE.INTERN, label: 'Intern', icon: 'school' },
            { value: HIRE_TYPE.FULL_TIME, label: 'Full-time', icon: 'work' },
          ]}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Role" required>
          <TextInput
            value={terms.role}
            onChange={(e) => set('role', e.target.value)}
            placeholder="e.g. HR & Administration Intern"
          />
        </Field>
        <Field
          label="Company name"
          required
          hint="As it reads in the agreements."
        >
          <TextInput
            value={terms.companyName}
            onChange={(e) => set('companyName', e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_96px] gap-3">
        <Field
          label="Monthly pay"
          required
          hint="The trial payment is worked out from this."
        >
          <TextInput
            inputMode="numeric"
            value={terms.monthlyPay}
            onChange={(e) =>
              set('monthlyPay', e.target.value.replace(/[^\d]/g, ''))
            }
            placeholder="20000"
          />
        </Field>
        <Field label="Currency">
          <NativeSelect
            value={terms.currency}
            onChange={(e) => set('currency', e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <PaySummary terms={terms} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Trial starts"
          hint="Or the day they get access, if later."
        >
          <DateInput
            value={terms.startDate}
            min={todayIst()}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </Field>
        <Field label="Where">
          <TextInput
            value={terms.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Remote"
          />
        </Field>
      </div>
      <Field label="First project">
        <NativeSelect
          value={terms.projectId}
          onChange={(e) => set('projectId', e.target.value)}
        >
          <option value="">No project yet</option>
          {board.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Hiring manager"
          hint="Named as their contact. A company owner when empty."
        >
          <NativeSelect
            value={terms.leadId}
            onChange={(e) => set('leadId', e.target.value)}
          >
            <option value="">A company owner</option>
            {board.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Buddy" hint="Optional. Can decide the trial too.">
          <NativeSelect
            value={terms.buddyId}
            onChange={(e) => set('buddyId', e.target.value)}
          >
            <option value="">No buddy</option>
            {board.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
    </div>
  );
};

const termsProblem = (t: TermsDraft) =>
  !t.role.trim()
    ? 'Add their role.'
    : !t.companyName.trim()
      ? 'Add the company name.'
      : !(Number(t.monthlyPay) > 0)
        ? 'Add their monthly pay.'
        : null;

/* ------------------------------ start a hire ------------------------------ */

export const StartDialog = ({
  open,
  onOpenChange,
  companyId,
  board,
  preset,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  board: BoardData;
  /** An applicant to start with, e.g. from the Hiring tab. */
  preset?: ReadyApplicant | null;
  onStarted: (hire: Hire) => void;
}) => {
  const { user } = useUser();
  const [pick, setPick] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [withTerms, setWithTerms] = useState(false);
  const [terms, setTerms] = useState<TermsDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const ready = useMemo(() => {
    const list = [...board.readyToOnboard];
    if (preset && !list.some((r) => r.applicationId === preset.applicationId))
      list.unshift(preset);
    return list;
  }, [board.readyToOnboard, preset]);
  const chosen = ready.find((r) => r.applicationId === pick) ?? null;

  useEffect(() => {
    if (!open) return;
    setPick(preset?.applicationId ?? ready[0]?.applicationId ?? 'other');
    setName('');
    setEmail('');
    setWithTerms(false);
    setTerms(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTerms(
      startingTerms(board, user?.id ?? null, {
        openingTitle: chosen?.openingTitle,
        location: chosen?.location,
        employmentType: chosen?.employmentType,
        projectId: chosen?.projectId,
        hiringLeadId: chosen?.hiringLeadId,
      }),
    );
  }, [open, chosen, board, user?.id]);

  const submit = async () => {
    if (withTerms && terms) {
      const problem = termsProblem(terms);
      if (problem) return toast.error(problem);
    }
    setSaving(true);
    try {
      const res = await PortalSdk.postData('/api/onboarding', {
        companyId,
        ...(chosen
          ? { applicationId: chosen.applicationId }
          : { name: name.trim(), email: email.trim() }),
        terms: withTerms && terms ? termsPayload(terms) : null,
      });
      const hire: Hire = res.data.hire;
      if (res.data.emailError)
        toast.warning(
          `Onboarding started, but the email did not go out: ${res.data.emailError}. Copy their link from the panel.`,
        );
      else toast.success(`Sent ${hire.name.split(' ')[0]} their details form`);
      onStarted(hire);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const who = chosen?.name ?? name;
  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title="Start onboarding"
      description="They get an email with a form for their details and photo. Filling it in makes their Portal account."
      icon="person_add"
      size="lg"
      footer={
        <>
          <AdminButton
            tone="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AdminButton>
          <AdminButton
            tone="primary"
            size="sm"
            icon="send"
            loading={saving}
            disabled={!chosen && (!name.trim() || !email.trim())}
            onClick={submit}
          >
            Send details form
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Who">
          <div className="grid gap-2 sm:grid-cols-2">
            {ready.map((r) => (
              <button
                key={r.applicationId}
                type="button"
                onClick={() => setPick(r.applicationId)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                  pick === r.applicationId
                    ? 'border-white/30 bg-white/[0.07]'
                    : 'border-white/[0.07] hover:border-white/15',
                )}
              >
                <UserAvatar name={r.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    {r.name}
                  </span>
                  <span className="block truncate text-xs text-neutral-500">
                    {r.openingTitle ?? r.email}
                  </span>
                </span>
                <CheckBox checked={pick === r.applicationId} size="sm" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPick('other')}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors',
                pick === 'other'
                  ? 'border-white/30 bg-white/[0.07]'
                  : 'border-white/10 hover:border-white/20',
              )}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-[18px] text-neutral-400">
                <Icon name="person_add" />
              </span>
              <span className="text-sm text-neutral-300">Someone else</span>
            </button>
          </div>
          {ready.length === 0 && (
            <p className="text-xs text-neutral-500">
              Applicants you move to Hired show up here. You can also onboard
              someone who didn’t apply through the portal.
            </p>
          )}
        </Field>

        {pick === 'other' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email" required>
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>
        )}

        <button
          type="button"
          onClick={() => setWithTerms(!withTerms)}
          className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left hover:border-white/15"
        >
          <CheckBox checked={withTerms} className="mt-0.5" />
          <span>
            <span className="block text-sm text-neutral-100">
              Fill in the agreement terms now
            </span>
            <span className="block text-xs text-neutral-500">
              The Trial Policy and NDA then go out by themselves the moment{' '}
              {who ? who.split(' ')[0] : 'they'} sends the form. Skip it to do
              it later.
            </span>
          </span>
        </button>
        {withTerms && terms && (
          <TermsFields board={board} terms={terms} onChange={setTerms} />
        )}
      </div>
    </AdminModal>
  );
};

/* --------------------------- terms and agreements -------------------------- */

export const TermsDialog = ({
  open,
  onOpenChange,
  hire,
  board,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hire: Hire;
  board: BoardData;
  onSaved: (hire: Hire) => void;
}) => {
  const { user } = useUser();
  const templates = useTemplates(hire.companyId, open);
  const [terms, setTerms] = useState<TermsDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const detailsIn = hire.step !== ONBOARDING_STEP.DETAILS;

  useEffect(() => {
    if (!open) return;
    setTerms(
      hire.terms
        ? termsDraftOf(hire.terms)
        : startingTerms(board, user?.id ?? null, {
            openingTitle: hire.openingTitle,
            hiringLeadId: hire.hiringLeadId,
          }),
    );
  }, [open, hire, board, user?.id]);

  if (!terms) return null;
  const vars = previewVariables(board, hire, terms);

  const save = async () => {
    const problem = termsProblem(terms);
    if (problem) return toast.error(problem);
    setSaving(true);
    try {
      const res = await PortalSdk.patchData(`/api/onboarding/${hire.id}`, {
        action: 'terms',
        terms: termsPayload(terms),
      });
      if (res.data.emailError)
        toast.warning(
          `Saved, but the email did not go out: ${res.data.emailError}`,
        );
      else
        toast.success(
          detailsIn
            ? `Sent the Trial Policy and NDA to ${hire.name.split(' ')[0]}`
            : 'Saved. They go out as soon as the details form is back.',
        );
      onSaved(res.data.hire);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={detailsIn ? 'Send the Trial Policy and NDA' : 'Agreement terms'}
      description="What you fill in here is written into the documents. The preview updates as you type."
      icon="signature"
      size="lg"
      footer={
        <>
          <AdminButton
            tone="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AdminButton>
          <AdminButton
            tone="primary"
            size="sm"
            icon="send"
            loading={saving}
            onClick={save}
          >
            {detailsIn ? 'Send to sign' : 'Save; send after details'}
          </AdminButton>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <TermsFields board={board} terms={terms} onChange={setTerms} />
        <LivePreview kinds={AGREEMENT_DOCS} templates={templates} vars={vars} />
      </div>
    </AdminModal>
  );
};

/* --------------------------------- trial ---------------------------------- */

export const DecideDialog = ({
  open,
  onOpenChange,
  hire,
  board,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hire: Hire;
  board: BoardData;
  initial: 'ACCEPTED' | 'REJECTED';
  onSaved: (hire: Hire) => void;
}) => {
  const templates = useTemplates(hire.companyId, open);
  const [outcome, setOutcome] = useState(initial);
  const [role, setRole] = useState('');
  const [hireType, setHireType] = useState<HIRE_TYPE>(HIRE_TYPE.FULL_TIME);
  const [pay, setPay] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [joiningDate, setJoiningDate] = useState(() => addDays(todayIst(), 1));
  const [noticeDays, setNoticeDays] = useState('15');
  const [offerNote, setOfferNote] = useState('');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOutcome(initial);
    const t = hire.terms;
    setRole(t?.role ?? '');
    setHireType(t?.hireType ?? HIRE_TYPE.FULL_TIME);
    setPay(t ? String(t.monthlyPay) : '');
    setCurrency(t?.currency ?? 'INR');
    // Full membership starts the day after the decision, early or not.
    setJoiningDate(addDays(todayIst(), 1));
    setNoticeDays('15');
    setOfferNote('');
    setNote('');
    setNotify(true);
  }, [open, initial, hire]);

  if (!hire.terms) return null;
  const early = !!hire.trialEndsOn && todayIst() < hire.trialEndsOn;
  const trial =
    hire.trialPay ??
    trialPayFor(
      hire.terms.monthlyPay,
      hire.terms.hireType,
      hire.terms.currency,
    );
  const first = hire.name.split(' ')[0];
  const offer = {
    role,
    hireType,
    monthlyPay: Number(pay) || 0,
    currency,
    joiningDate,
    noticeDays: Number(noticeDays) || 0,
    note: offerNote,
  };
  const vars = previewVariables(board, hire, termsDraftOf(hire.terms), offer);

  const save = async () => {
    if (outcome === 'ACCEPTED' && !(offer.monthlyPay > 0))
      return toast.error('Add their monthly pay for the offer.');
    setSaving(true);
    try {
      const res = await PortalSdk.patchData(`/api/onboarding/${hire.id}`, {
        action: 'decide',
        outcome,
        offer: outcome === 'ACCEPTED' ? offer : null,
        note,
        notify,
      });
      if (res.data.emailError)
        toast.warning(
          `Done, but the email did not go out: ${res.data.emailError}`,
        );
      else
        toast.success(
          outcome === 'ACCEPTED'
            ? `Sent ${first} their offer`
            : `${first}'s trial has ended and their access is closed`,
        );
      onSaved(res.data.hire);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Decide ${first}'s trial`}
      description={
        hire.trialStartsOn
          ? `Trial ${formatDay(hire.trialStartsOn)} to ${formatDay(hire.trialEndsOn)}`
          : undefined
      }
      icon="gavel"
      size={outcome === 'ACCEPTED' ? 'lg' : 'md'}
      footer={
        <>
          <AdminButton
            tone="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AdminButton>
          {outcome === 'ACCEPTED' ? (
            <AdminButton
              tone="primary"
              size="sm"
              icon="send"
              loading={saving}
              onClick={save}
            >
              Confirm and send offer
            </AdminButton>
          ) : (
            <AdminButton
              tone="danger"
              size="sm"
              icon="block"
              loading={saving}
              onClick={save}
            >
              End trial and close access
            </AdminButton>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Segmented
          value={outcome}
          onChange={setOutcome}
          options={[
            { value: 'ACCEPTED', label: 'Confirm', icon: 'verified' },
            { value: 'REJECTED', label: 'End trial', icon: 'block' },
          ]}
        />
        {outcome === 'ACCEPTED' ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="flex flex-col gap-4">
              {early && (
                <p className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
                  <Icon name="bolt" className="mt-0.5 text-[16px]" />
                  Their trial runs until {formatDay(hire.trialEndsOn)}.
                  Confirming now skips the rest of it.
                </p>
              )}
              <p className="text-xs text-neutral-400">
                They get the Offer Letter and Work Agreement to sign. Claude
                opens for them once both are signed. Trial pay owed:{' '}
                <span className="font-medium text-emerald-300">
                  {formatMoney(trial.full, trial.currency)}
                </span>
                .
              </p>
              <Field label="Role">
                <TextInput
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </Field>
              <Field label="Type">
                <Segmented
                  value={hireType}
                  onChange={setHireType}
                  options={[
                    { value: HIRE_TYPE.INTERN, label: 'Intern' },
                    { value: HIRE_TYPE.FULL_TIME, label: 'Full-time' },
                  ]}
                />
              </Field>
              <div className="grid grid-cols-[1fr_96px] gap-3">
                <Field label="Monthly pay">
                  <TextInput
                    inputMode="numeric"
                    value={pay}
                    onChange={(e) =>
                      setPay(e.target.value.replace(/[^\d]/g, ''))
                    }
                  />
                </Field>
                <Field label="Currency">
                  <NativeSelect
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Joining date">
                  <DateInput
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                  />
                </Field>
                <Field label="Notice (days)">
                  <TextInput
                    inputMode="numeric"
                    value={noticeDays}
                    onChange={(e) =>
                      setNoticeDays(e.target.value.replace(/[^\d]/g, ''))
                    }
                  />
                </Field>
              </div>
              <Field label="A line for the offer letter" hint="Optional.">
                <TextArea
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  className="min-h-[64px]"
                />
              </Field>
              <Field label="Note for the record" hint="Not sent to them.">
                <TextInput
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>
            <LivePreview kinds={OFFER_DOCS} templates={templates} vars={vars} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.07] p-4 text-sm text-rose-100">
              <p className="font-medium">
                This closes all of {first}’s Portal access now.
              </p>
              <p className="mt-1 text-rose-200/80">
                As the Trial Policy says, they are still paid half the trial
                amount:{' '}
                <span className="font-semibold text-white">
                  {formatMoney(trial.half, trial.currency)}
                </span>
                .
              </p>
            </div>
            <Field label="Why" hint="For the record, not sent to them.">
              <TextArea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[72px]"
              />
            </Field>
            <button
              type="button"
              onClick={() => setNotify(!notify)}
              className="flex items-center gap-2 text-left text-sm text-neutral-300"
            >
              <CheckBox checked={notify} size="sm" />
              Email {first} that the trial has ended, with the trial payment
            </button>
          </div>
        )}
      </div>
    </AdminModal>
  );
};

/* -------------------------------- documents -------------------------------- */

export const DocViewer = ({
  doc,
  onOpenChange,
}: {
  doc: Hire['documents'][number] | null;
  onOpenChange: (open: boolean) => void;
}) => (
  <AdminModal
    open={!!doc}
    onOpenChange={onOpenChange}
    title={doc?.title ?? ''}
    description={
      doc ? `Sent ${new Date(doc.sentAt).toLocaleString()}` : undefined
    }
    icon="description"
    size="lg"
    footer={
      <AdminButton size="sm" icon="print" onClick={() => window.print()}>
        Print
      </AdminButton>
    }
  >
    {doc && (
      <Paper
        body={doc.body}
        footer={
          <div className="mt-8 border-t border-zinc-200 pt-5 text-sm">
            {doc.signature ? (
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-[cursive] text-2xl text-zinc-900">
                    {doc.signature.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Signed {new Date(doc.signature.at).toLocaleString()}
                    {doc.signature.ip ? ` · ${doc.signature.ip}` : ''}
                  </p>
                </div>
                <p className="max-w-[260px] break-all text-[10px] leading-snug text-zinc-400">
                  Fingerprint {doc.hash}
                </p>
              </div>
            ) : (
              <Pill tone="warning" icon="schedule">
                Not signed yet
              </Pill>
            )}
          </div>
        }
      />
    )}
  </AdminModal>
);
