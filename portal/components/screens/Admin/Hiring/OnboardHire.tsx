'use client';

/*
 * TODO(onboarding): not shown anywhere yet. It calls
 * /api/hiring/applications/:id/onboard, which comes back with it; see
 * lib/hiring/onboarding.ts.
 */

import type { User } from '@db/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ApplicationOnboarding } from '@/models/hiring';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  Field,
  Icon,
  IconAction,
  NativeSelect,
  Spin,
  TextInput,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { type ApplicationRow, timeAgo } from './hiringMeta';

interface OnboardContext {
  existingUser: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  projects: Array<{ id: string; name: string; isCore?: boolean }>;
  projectId: string | null;
  buddyId: string | null;
  checklist: string[];
  canCreateAccount: boolean;
  canAddMember: boolean;
  onboarding: ApplicationOnboarding | null;
}

/**
 * Hired to onboarded: make or find their portal account, add them to the
 * company and a project, make the hiring lead their buddy and start a
 * first-week checklist.
 */
export const OnboardHire = ({
  application,
  users,
  onUpdated,
}: {
  application: ApplicationRow;
  users: User[];
  onUpdated: (application: ApplicationRow) => void;
}) => {
  const [context, setContext] = useState<OnboardContext | null>(null);
  const [projectId, setProjectId] = useState('');
  const [buddyId, setBuddyId] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [adding, setAdding] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    PortalSdk.getData(
      `/api/hiring/applications/${application.id}/onboard`,
      null,
    )
      .then((res) => {
        if (cancelled) return;
        const data: OnboardContext = res.data;
        setContext(data);
        setProjectId(data.onboarding?.projectId ?? data.projectId ?? '');
        setBuddyId(data.onboarding?.buddyId ?? data.buddyId ?? '');
        setChecklist(data.checklist);
      })
      .catch((err) => !cancelled && toast.error(errorText(err)));
    return () => {
      cancelled = true;
    };
  }, [application.id]);

  const done = application.onboarding;
  const nameOf = (id?: string | null) =>
    (id && users.find((u) => u.id === id)?.name) || 'a teammate';

  const submit = async () => {
    setSaving(true);
    try {
      const res = await PortalSdk.postData(
        `/api/hiring/applications/${application.id}/onboard`,
        { projectId: projectId || null, buddyId: buddyId || null, checklist },
      );
      onUpdated(res.data.application);
      toast.success(
        res.data.createdAccount
          ? `${application.name.split(/\s+/)[0]} is in. Their sign-in code is on its way by email.`
          : `${application.name.split(/\s+/)[0]} is onboarded`,
      );
      setEditing(false);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  if (!context)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-neutral-400">
        <Spin className="size-3.5" /> Getting onboarding ready…
      </div>
    );

  if (done && !editing)
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-emerald-200">
          <Icon name="how_to_reg" className="text-[18px]" />
          Onboarded {timeAgo(done.at)} by {nameOf(done.byUserId)}
        </p>
        <ul className="flex flex-col gap-1 pl-7 text-xs text-neutral-400">
          <li>
            {done.createdAccount
              ? 'Portal account made'
              : 'Existing portal account linked'}{' '}
            and added to the company
          </li>
          {done.projectId && (
            <li>
              On{' '}
              {context.projects.find((p) => p.id === done.projectId)?.name ??
                'their project'}
            </li>
          )}
          {done.buddyId && <li>Buddy: {nameOf(done.buddyId)}</li>}
          {done.taskIds.length > 0 && (
            <li>{done.taskIds.length} first-week tasks, due in a week</li>
          )}
        </ul>
        <AdminButton
          size="sm"
          tone="ghost"
          className="self-start"
          onClick={() => setEditing(true)}
        >
          Change project or buddy
        </AdminButton>
      </div>
    );

  const blocked = !context.canAddMember
    ? 'Adding people to the company needs the members:create permission.'
    : !context.existingUser && !context.canCreateAccount
      ? `${application.name.split(/\s+/)[0]} has no portal account yet, and making one needs a portal admin (users:create).`
      : null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-200">
          <Icon name="rocket_launch" className="text-[18px]" />
          Onboard {application.name.split(/\s+/)[0]}
        </p>
        <p className="mt-0.5 pl-7 text-xs text-neutral-400">
          {context.existingUser
            ? `They already have a portal account (${context.existingUser.email}). It’s added to the company.`
            : `A portal account is made for ${application.email}, and their sign-in code is emailed to them.`}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Project">
          <NativeSelect
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">No project</option>
            {context.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Buddy" hint="The hiring lead by default.">
          <NativeSelect
            value={buddyId}
            onChange={(e) => setBuddyId(e.target.value)}
          >
            <option value="">No buddy</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {!done?.taskIds?.length && (
        <Field
          label="First-week checklist"
          hint={
            projectId
              ? 'Each becomes a task for them on the project, due in a week. Their buddy gets a welcome task too.'
              : 'Pick a project to make these tasks.'
          }
        >
          <ul className="flex flex-col gap-1">
            {checklist.map((item, i) => (
              <li
                key={`${item}-${i}`}
                className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 text-sm text-neutral-200"
              >
                <Icon
                  name="check_box_outline_blank"
                  className="text-[16px] text-neutral-500"
                />
                <span className="flex-1">{item}</span>
                <IconAction
                  icon="close"
                  label="Remove"
                  onClick={() =>
                    setChecklist((list) => list.filter((_, j) => j !== i))
                  }
                />
              </li>
            ))}
          </ul>
          <form
            className="mt-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!adding.trim()) return;
              setChecklist((list) => [...list, adding.trim()]);
              setAdding('');
            }}
          >
            <TextInput
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="Add a step…"
              className="h-9 text-sm"
            />
            <AdminButton size="sm" type="submit" disabled={!adding.trim()}>
              Add
            </AdminButton>
          </form>
        </Field>
      )}
      {blocked && (
        <p className="flex items-start gap-2 text-xs text-amber-200">
          <Icon name="lock" className="mt-px text-[15px]" />
          {blocked}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {editing && (
          <AdminButton size="sm" tone="ghost" onClick={() => setEditing(false)}>
            Cancel
          </AdminButton>
        )}
        <AdminButton
          size="sm"
          tone="primary"
          icon="how_to_reg"
          loading={saving}
          disabled={!!blocked}
          onClick={submit}
        >
          {done ? 'Save' : 'Onboard'}
        </AdminButton>
      </div>
    </div>
  );
};
