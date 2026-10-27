'use client';

import type { Task, User } from '@db/client';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  EmptyState,
  Field,
  UserAvatar,
} from '../../Admin/shared/AdminUI';
import type { ProjectRow } from '../../Admin/Workspace/AdminProjects';
import { errorText, PeoplePicker } from '../../Admin/Workspace/shared';
import type { Person } from '../types';
import { SectionShell } from './SectionShell';

const OPEN = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];

/** The project's leads and team, with what each has on their plate. */
export const MembersSection = ({
  project,
  tasks,
  people,
  companyUsers,
  canEdit,
  onSaved,
}: {
  project: ProjectRow;
  tasks: Task[];
  people: Person[];
  companyUsers: User[];
  canEdit: boolean;
  onSaved: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [leadIds, setLeadIds] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const leads = project.leadIds ?? [];
  const ids = Array.from(new Set([...leads, ...(project.memberIds ?? [])]));
  const monthStart = dayjs().startOf('month').toISOString();

  const save = async () => {
    setSaving(true);
    try {
      await PortalSdk.patchData(`/api/projects/${project.id}`, {
        leadIds,
        memberIds,
      });
      toast.success('Team updated');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionShell
      icon="group"
      title="Members"
      description="Who leads the project and who works on it. Leads and team can add and change its tasks."
      actions={
        canEdit && (
          <AdminButton
            size="sm"
            icon="person_add"
            onClick={() => {
              setLeadIds(project.leadIds ?? []);
              setMemberIds(project.memberIds ?? []);
              setEditing(true);
            }}
          >
            Edit team
          </AdminButton>
        )
      }
    >
      {ids.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10">
          <EmptyState
            icon="group_add"
            title="Nobody on the project yet"
            description="Add a lead and the people who work on it."
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ids.map((id, i) => {
            const person = people.find((p) => p.id === id);
            const mine = tasks.filter((t) => t.assigneeIds?.includes(id));
            const open = mine.filter((t) => OPEN.includes(t.status)).length;
            const doneThisMonth = mine.filter(
              (t) =>
                t.status === 'DONE' &&
                t.completedAt &&
                String(t.completedAt) >= monthStart,
            ).length;
            const isLead = leads.includes(id);
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col gap-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-white/15"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={person?.avatar}
                    name={person?.name}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {person?.name || 'Unknown'}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {person?.positionTitle ||
                        (person?.username ? `@${person.username}` : '')}
                    </p>
                  </div>
                  <span
                    className={
                      isLead
                        ? 'rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200'
                        : 'rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-neutral-400'
                    }
                  >
                    {isLead ? 'Lead' : 'Team'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white/[0.03] py-2">
                    <p className="text-lg font-semibold text-white">{open}</p>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Open
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] py-2">
                    <p className="text-lg font-semibold text-emerald-300">
                      {doneThisMonth}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Done in {dayjs().format('MMM')}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AdminModal
        open={editing}
        onOpenChange={setEditing}
        size="lg"
        icon="group"
        title="Project team"
        footer={
          <>
            <AdminButton
              tone="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              loading={saving}
              onClick={save}
            >
              Save
            </AdminButton>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Leads">
            <PeoplePicker
              users={companyUsers}
              value={leadIds}
              onChange={setLeadIds}
            />
          </Field>
          <Field label="Team">
            <PeoplePicker
              users={companyUsers}
              value={memberIds}
              onChange={setMemberIds}
            />
          </Field>
        </div>
      </AdminModal>
    </SectionShell>
  );
};
