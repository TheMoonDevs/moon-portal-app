'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  formatDay,
  formatMoney,
  HIRE_TYPE_LABEL,
  hireNext,
  stepIndex,
  STEPS,
  trialDay,
} from '@/lib/onboarding/meta';
import { cn } from '@/lib/utils';
import { ONBOARDING_STEP } from '@/models/onboarding';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  CopyButton,
  Icon,
  IconAction,
  TextArea,
  UserAvatar,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { ago, type BoardData, type Hire } from './onboardingClient';
import { DecideDialog, DocViewer, TermsDialog } from './OnboardingDialogs';

/** The five steps, with the current one lit. */
export const Stepper = ({ hire }: { hire: Hire }) => {
  const ended = hire.step === ONBOARDING_STEP.ENDED;
  const at = ended
    ? hire.accessAt
      ? hire.decision
        ? 2
        : 1
      : hire.details
        ? 1
        : 0
    : stepIndex(hire.step);
  return (
    <ol className="grid grid-cols-5 gap-1">
      {STEPS.map((s, i) => {
        const done = !ended && (i < at || hire.step === ONBOARDING_STEP.HIRED);
        const current = i === at && hire.step !== ONBOARDING_STEP.HIRED;
        return (
          <li
            key={s.step}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <span className="flex w-full items-center">
              <span
                className={cn(
                  'h-px flex-1',
                  i === 0
                    ? 'opacity-0'
                    : done || current
                      ? 'bg-white/40'
                      : 'bg-white/10',
                )}
              />
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border text-[16px] transition-colors',
                  done &&
                    'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
                  current &&
                    !ended &&
                    'border-white bg-white text-neutral-950 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]',
                  current &&
                    ended &&
                    'border-rose-400/40 bg-rose-500/15 text-rose-300',
                  !done && !current && 'border-white/10 text-neutral-600',
                )}
              >
                <Icon
                  name={done ? 'check' : current && ended ? 'block' : s.icon}
                />
              </span>
              <span
                className={cn(
                  'h-px flex-1',
                  i === STEPS.length - 1
                    ? 'opacity-0'
                    : done
                      ? 'bg-white/40'
                      : 'bg-white/10',
                )}
              />
            </span>
            <span
              className={cn(
                'text-[11px] font-medium',
                current
                  ? 'text-white'
                  : done
                    ? 'text-neutral-300'
                    : 'text-neutral-600',
              )}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const Section = ({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        <Icon name={icon} className="text-[16px]" />
        {title}
      </h3>
      {action}
    </div>
    {children}
  </section>
);

const Row = ({ label, value }: { label: string; value?: React.ReactNode }) =>
  value ? (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="min-w-0 break-words text-neutral-200">{value}</span>
    </div>
  ) : null;

export const HireDrawer = ({
  hire,
  board,
  canEdit,
  onClose,
  onUpdated,
}: {
  hire: Hire | null;
  board: BoardData;
  canEdit: boolean;
  onClose: () => void;
  onUpdated: (hire: Hire) => void;
}) => {
  const [termsOpen, setTermsOpen] = useState(false);
  const [decide, setDecide] = useState<'ACCEPTED' | 'REJECTED' | null>(null);
  const [viewing, setViewing] = useState<Hire['documents'][number] | null>(
    null,
  );
  const [stopping, setStopping] = useState(false);
  const [stopNote, setStopNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (action: string, body: Record<string, unknown> = {}) => {
    if (!hire) return;
    setBusy(action);
    try {
      const res = await PortalSdk.patchData(`/api/onboarding/${hire.id}`, {
        action,
        ...body,
      });
      onUpdated(res.data.hire);
      if (res.data.emailError)
        toast.warning(`The email did not go out: ${res.data.emailError}`);
      else if (action === 'resend') toast.success('Sent again');
      else if (action === 'end') toast.success('Onboarding stopped');
      setStopping(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const next = hire ? hireNext(hire) : null;
  const trial = hire ? trialDay(hire.trialStartsOn, hire.trialEndsOn) : null;
  const person = (id?: string | null) => board.people.find((p) => p.id === id);
  const project = board.projects.find((p) => p.id === hire?.terms?.projectId);
  const first = hire?.name.split(' ')[0] ?? '';
  const live =
    !!hire &&
    hire.step !== ONBOARDING_STEP.ENDED &&
    hire.step !== ONBOARDING_STEP.HIRED;

  return (
    <DialogPrimitive.Root open={!!hire} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-[56] flex w-full max-w-[560px] flex-col border-l border-white/10 bg-neutral-950 shadow-2xl shadow-black/60 data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
          {hire && next && (
            <>
              <div className="flex items-start gap-4 border-b border-white/[0.07] p-5">
                <UserAvatar src={hire.avatar} name={hire.name} size={56} />
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="truncate text-lg font-semibold text-white">
                    {hire.name}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="truncate text-xs text-neutral-500">
                    {[
                      hire.terms?.role ?? hire.openingTitle,
                      hire.terms && HIRE_TYPE_LABEL[hire.terms.hireType],
                      hire.email,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </DialogPrimitive.Description>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="truncate rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-neutral-500">
                      {hire.joinUrl.replace(/^https?:\/\//, '')}
                    </span>
                    <CopyButton value={hire.joinUrl} label="Copy their link" />
                  </div>
                </div>
                <DialogPrimitive.Close asChild>
                  <IconAction icon="close" label="Close" />
                </DialogPrimitive.Close>
              </div>

              <div className="custom-scrollbar flex flex-1 flex-col gap-7 overflow-y-auto p-5">
                <Stepper hire={hire} />

                <div
                  className={cn(
                    'flex flex-col gap-3 rounded-2xl border p-4',
                    next.who === 'you'
                      ? 'border-amber-400/30 bg-amber-500/[0.08]'
                      : next.who === 'ended'
                        ? 'border-rose-500/20 bg-rose-500/[0.06]'
                        : next.who === 'done'
                          ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
                          : 'border-white/[0.08] bg-white/[0.03]',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      name={
                        next.who === 'you'
                          ? 'front_hand'
                          : next.who === 'done'
                            ? 'celebration'
                            : next.who === 'ended'
                              ? 'block'
                              : 'hourglass_top'
                      }
                      className={cn(
                        'mt-0.5 text-[20px]',
                        next.who === 'you'
                          ? 'text-amber-300'
                          : 'text-neutral-400',
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {next.who === 'you' ? 'Your move' : next.short}
                      </p>
                      <p className="text-sm text-neutral-400">{next.text}</p>
                      {hire.lastEmail && live && (
                        <p className="mt-1 text-xs text-neutral-600">
                          Last email: “{hire.lastEmail.subject}”,{' '}
                          {ago(hire.lastEmail.at)}
                        </p>
                      )}
                    </div>
                  </div>
                  {canEdit && live && (
                    <div className="flex flex-wrap gap-2 pl-8">
                      {(hire.step === ONBOARDING_STEP.DETAILS ||
                        (hire.step === ONBOARDING_STEP.AGREEMENTS &&
                          !hire.documents.some((d) => d.signature))) && (
                        <AdminButton
                          size="sm"
                          tone={next.who === 'you' ? 'primary' : 'secondary'}
                          icon="signature"
                          onClick={() => setTermsOpen(true)}
                        >
                          {hire.step === ONBOARDING_STEP.DETAILS
                            ? hire.terms
                              ? 'Edit agreement terms'
                              : 'Fill in agreement terms'
                            : hire.documents.length
                              ? 'Change terms and resend'
                              : 'Fill in terms and send'}
                        </AdminButton>
                      )}
                      {hire.step === ONBOARDING_STEP.TRIAL &&
                        hire.canDecide && (
                          <>
                            <AdminButton
                              size="sm"
                              tone="primary"
                              icon="verified"
                              onClick={() => setDecide('ACCEPTED')}
                            >
                              {next.who === 'you'
                                ? 'Confirm and send offer'
                                : 'Confirm early'}
                            </AdminButton>
                            <AdminButton
                              size="sm"
                              tone="danger"
                              icon="block"
                              onClick={() => setDecide('REJECTED')}
                            >
                              End trial
                            </AdminButton>
                          </>
                        )}
                      {hire.step === ONBOARDING_STEP.TRIAL &&
                        !hire.canDecide && (
                          <p className="text-xs text-neutral-500">
                            Their hiring manager, buddy or a company owner
                            decides the trial.
                          </p>
                        )}
                      {!(
                        hire.step === ONBOARDING_STEP.AGREEMENTS &&
                        !hire.documents.length
                      ) && (
                        <AdminButton
                          size="sm"
                          tone="ghost"
                          icon="forward_to_inbox"
                          loading={busy === 'resend'}
                          onClick={() => act('resend')}
                        >
                          Email again
                        </AdminButton>
                      )}
                    </div>
                  )}
                </div>

                {hire.trialStartsOn && trial && (
                  <Section title="Trial" icon="hourglass_top">
                    <div className="rounded-xl border border-white/[0.07] p-4">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-white">
                          {hire.decision
                            ? hire.decision.outcome === 'ACCEPTED'
                              ? `Confirmed${hire.decision.early ? ' early' : ''}`
                              : 'Ended'
                            : `Day ${Math.max(trial.day, 0)} of ${trial.total}`}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {formatDay(hire.trialStartsOn)} →{' '}
                          {formatDay(hire.trialEndsOn)}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            hire.decision?.outcome === 'REJECTED'
                              ? 'bg-rose-400'
                              : 'bg-emerald-400',
                          )}
                          style={{
                            width: `${hire.decision ? 100 : Math.min(100, (Math.max(trial.day, 0) / trial.total) * 100)}%`,
                          }}
                        />
                      </div>
                      {hire.decision?.note && (
                        <p className="mt-3 text-xs text-neutral-500">
                          “{hire.decision.note}”
                        </p>
                      )}
                    </div>
                  </Section>
                )}

                {hire.documents.length > 0 && (
                  <Section title="Documents" icon="description">
                    <div className="flex flex-col divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.07]">
                      {hire.documents.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setViewing(d)}
                          className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                        >
                          <Icon
                            name={
                              d.signature
                                ? 'task_alt'
                                : d.viewedAt
                                  ? 'visibility'
                                  : 'mail'
                            }
                            className={cn(
                              'text-[18px]',
                              d.signature
                                ? 'text-emerald-300'
                                : 'text-neutral-500',
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-neutral-100">
                              {d.title}
                            </span>
                            <span className="block text-xs text-neutral-500">
                              {d.signature
                                ? `Signed as “${d.signature.name}”, ${ago(d.signature.at)}`
                                : d.viewedAt
                                  ? `Opened ${ago(d.viewedAt)}, not signed yet`
                                  : `Sent ${ago(d.sentAt)}, not opened yet`}
                            </span>
                          </span>
                          <Icon
                            name="chevron_right"
                            className="text-[18px] text-neutral-600"
                          />
                        </button>
                      ))}
                    </div>
                  </Section>
                )}

                {hire.details && (
                  <Section title="Their details" icon="badge">
                    <div className="rounded-xl border border-white/[0.07] px-4 py-2">
                      <Row label="Legal name" value={hire.details.legalName} />
                      <Row label="Goes by" value={hire.details.preferredName} />
                      <Row
                        label="Signs in with"
                        value={hire.details.signInEmail}
                      />
                      <Row label="Phone" value={hire.details.phone} />
                      <Row
                        label="Born"
                        value={formatDay(hire.details.dateOfBirth)}
                      />
                      <Row
                        label="Lives in"
                        value={[
                          hire.details.address,
                          hire.details.city,
                          hire.details.country,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      />
                      <Row label="Timezone" value={hire.details.timezone} />
                      <Row label="LinkedIn" value={hire.details.linkedin} />
                      <Row label="Portfolio" value={hire.details.portfolio} />
                      <Row
                        label="Emergency"
                        value={[
                          hire.details.emergencyName,
                          hire.details.emergencyPhone,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      />
                    </div>
                  </Section>
                )}

                {hire.terms && (
                  <Section title="Terms" icon="tune">
                    <div className="rounded-xl border border-white/[0.07] px-4 py-2">
                      <Row
                        label="Role"
                        value={`${hire.terms.role} (${HIRE_TYPE_LABEL[hire.terms.hireType]})`}
                      />
                      <Row
                        label="Monthly pay"
                        value={formatMoney(
                          hire.terms.monthlyPay,
                          hire.terms.currency,
                        )}
                      />
                      <Row label="First project" value={project?.name} />
                      <Row label="Where" value={hire.terms.location} />
                      <Row
                        label="Manager"
                        value={
                          person(hire.terms.leadId)?.name ?? 'A company owner'
                        }
                      />
                      <Row
                        label="Buddy"
                        value={person(hire.terms.buddyId)?.name}
                      />
                      {hire.offer && (
                        <Row
                          label="Offer"
                          value={`${hire.offer.role}, ${formatMoney(hire.offer.monthlyPay, hire.offer.currency)} a month from ${formatDay(hire.offer.joiningDate)}`}
                        />
                      )}
                    </div>
                  </Section>
                )}

                <Section title="History" icon="history">
                  <ol className="relative flex flex-col gap-3 border-l border-white/[0.08] pl-4">
                    {hire.history.map((h, i) => (
                      <li key={i} className="relative text-sm">
                        <span className="absolute left-[-21px] top-1.5 size-2 rounded-full bg-neutral-600" />
                        <p className="text-neutral-300">{h.text}</p>
                        <p className="text-[11px] text-neutral-600">
                          {new Date(h.at).toLocaleString()}
                          {h.byUserId && person(h.byUserId)
                            ? ` · ${person(h.byUserId)!.name}`
                            : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                </Section>

                {canEdit && live && hire.step !== ONBOARDING_STEP.TRIAL && (
                  <button
                    type="button"
                    onClick={() => setStopping(true)}
                    className="self-start text-xs text-neutral-600 underline-offset-2 hover:text-rose-300 hover:underline"
                  >
                    Stop onboarding {first}
                  </button>
                )}
              </div>

              <TermsDialog
                open={termsOpen}
                onOpenChange={setTermsOpen}
                hire={hire}
                board={board}
                onSaved={onUpdated}
              />
              <DecideDialog
                open={!!decide}
                onOpenChange={(o) => !o && setDecide(null)}
                hire={hire}
                board={board}
                initial={decide ?? 'ACCEPTED'}
                onSaved={onUpdated}
              />
              <DocViewer
                doc={viewing}
                onOpenChange={(o) => !o && setViewing(null)}
              />
              <AdminModal
                open={stopping}
                onOpenChange={setStopping}
                title={`Stop onboarding ${first}?`}
                description="Use this when they withdraw or decline the offer. Any portal access they have closes."
                icon="block"
                size="sm"
                footer={
                  <>
                    <AdminButton
                      tone="ghost"
                      size="sm"
                      onClick={() => setStopping(false)}
                    >
                      Cancel
                    </AdminButton>
                    <AdminButton
                      tone="danger"
                      size="sm"
                      loading={busy === 'end'}
                      onClick={() => act('end', { note: stopNote })}
                    >
                      Stop onboarding
                    </AdminButton>
                  </>
                }
              >
                <TextArea
                  value={stopNote}
                  onChange={(e) => setStopNote(e.target.value)}
                  placeholder="Why, for the record"
                  className="min-h-[72px]"
                />
              </AdminModal>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
