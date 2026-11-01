'use client';

import type { User } from '@db/client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  claudeCodeInstallCommand,
  type HiringSkillView,
  parseSkill,
  skillInstallPrompt,
  tipLines,
} from '@/lib/hiring/skills';
import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  ConfirmDialog,
  CopyButton,
  EmptyState,
  Field,
  Icon,
  Panel,
  Pill,
  Segmented,
  SkeletonRows,
  TextArea,
} from '../shared/AdminUI';
import { errorText } from '../Workspace/shared';
import { timeAgo } from './hiringMeta';

const downloadUrl = (companyId: string, name: string) =>
  `/api/hiring/skills/download?${new URLSearchParams({ companyId, name })}`;

/** A block of text to copy, such as a terminal command. */
const CopyBlock = ({ value, label }: { value: string; label: string }) => (
  <div className="relative">
    <pre className="max-h-40 overflow-auto rounded-lg border border-white/[0.07] bg-black/40 p-3 pr-10 font-mono text-[11px] leading-relaxed text-neutral-300">
      {value}
    </pre>
    <CopyButton
      value={value}
      label={label}
      className="absolute right-1 top-1"
    />
  </div>
);

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3 text-sm text-neutral-300">
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
      {n}
    </span>
    <span className="min-w-0 flex-1">{children}</span>
  </li>
);

/** How to install one skill, for the Claude app or Claude Code. */
const InstallSteps = ({
  skill,
  companyId,
}: {
  skill: HiringSkillView;
  companyId: string;
}) => {
  const [where, setWhere] = useState<'app' | 'code'>('app');
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        value={where}
        onChange={setWhere}
        options={[
          { value: 'app', label: 'Claude app', icon: 'desktop_windows' },
          { value: 'code', label: 'Claude Code', icon: 'terminal' },
        ]}
        className="self-start"
      />
      {where === 'app' ? (
        <ol className="flex flex-col gap-2.5">
          <Step n={1}>
            Connect the portal to Claude, if you haven&apos;t:{' '}
            <a href="/settings#claude" className="text-sky-300 hover:underline">
              Settings, then Claude
            </a>
            . The skill works through the portal&apos;s hiring tools.
          </Step>
          <Step n={2}>
            <a
              href={downloadUrl(companyId, skill.name)}
              className="inline-flex items-center gap-1 text-sky-300 hover:underline"
            >
              <Icon name="download" className="text-[15px]" />
              Download {skill.name}.zip
            </a>{' '}
            (don&apos;t unzip it).
          </Step>
          <Step n={3}>
            In Claude (claude.ai or the desktop app), open{' '}
            <b>Settings → Capabilities</b> and make sure{' '}
            <b>Code execution and file creation</b> is on. Skills need it.
          </Step>
          <Step n={4}>
            In the <b>Skills</b> section, click <b>Upload skill</b> and pick the
            zip. In newer versions this lives under <b>Customize → Skills</b>.
            Make sure it&apos;s switched on.
          </Step>
          <Step n={5}>
            That&apos;s it: it follows your account to the web, desktop and
            phone. To update it later, download the zip again and upload it over
            the old one.
          </Step>
          <p className="text-xs text-neutral-500">
            On a Team or Enterprise plan, an owner can add it once for everyone
            from Admin settings instead. Skills need a Pro, Max, Team or
            Enterprise plan.
          </p>
        </ol>
      ) : (
        <ol className="flex flex-col gap-2.5">
          <Step n={1}>
            Paste this into a terminal (macOS or Linux). It saves the skill to{' '}
            <code className="font-mono text-xs">
              ~/.claude/skills/{skill.name}/
            </code>
            , replacing an older copy, so run it again to update.
            <div className="mt-2">
              <CopyBlock
                value={claudeCodeInstallCommand(skill.name, skill.body)}
                label="Copy install command"
              />
            </div>
          </Step>
          <Step n={2}>
            Add the portal&apos;s connector to Claude Code if you haven&apos;t (
            <a href="/settings#claude" className="text-sky-300 hover:underline">
              Settings, then Claude
            </a>
            ).
          </Step>
          <Step n={3}>
            Start <code className="font-mono text-xs">claude</code> and type{' '}
            <code className="font-mono text-xs">/{skill.name}</code>, or just
            ask for the work and Claude picks the skill up on its own.
          </Step>
        </ol>
      )}
    </div>
  );
};

const SkillCard = ({
  skill,
  companyId,
  canEdit,
  nameOf,
  onEdit,
  onDelete,
}: {
  skill: HiringSkillView;
  companyId: string;
  canEdit: boolean;
  nameOf: (id?: string | null) => string;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const [more, setMore] = useState<'manual' | 'body' | null>(null);
  const [copied, setCopied] = useState(false);
  const tips = tipLines(skill.tips);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(
        skillInstallPrompt(skill.name, skill.body, window.location.origin),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Use “Install it by hand” instead.');
    }
  };
  return (
    <Panel className="flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Icon name="psychology" className="text-[20px] text-violet-300" />
            <h3 className="font-mono text-base font-semibold text-white">
              {skill.name}
            </h3>
            {skill.builtIn ? (
              <Pill tone="purple">Built in</Pill>
            ) : (
              <Pill>
                Saved by {nameOf(skill.updatedById)}
                {skill.updatedAt ? ` · ${timeAgo(skill.updatedAt)}` : ''}
              </Pill>
            )}
          </div>
          <p className="mt-1.5 text-sm text-neutral-400">{skill.description}</p>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <AdminButton size="sm" tone="ghost" icon="edit" onClick={onEdit}>
              {skill.builtIn ? 'Customise' : 'Edit'}
            </AdminButton>
          )}
          {canEdit && !skill.builtIn && (
            <AdminButton
              size="sm"
              tone="ghost"
              icon="delete"
              onClick={onDelete}
            >
              Remove
            </AdminButton>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.06] px-4 py-3">
        <AdminButton
          tone="primary"
          icon={copied ? 'check' : 'content_copy'}
          onClick={copyPrompt}
        >
          {copied ? 'Copied' : 'Copy install prompt'}
        </AdminButton>
        <p className="min-w-0 flex-1 text-sm text-neutral-300">
          Paste it into Claude, in the app or in Claude Code, and it installs
          itself. Paste it again whenever the skill changes.
        </p>
      </div>

      {tips.length > 0 && (
        <ul className="flex flex-col gap-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm text-neutral-300">
              <Icon
                name="lightbulb"
                className="mt-0.5 text-[15px] text-amber-300"
              />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {(
            [
              ['manual', 'Install it by hand instead'],
              ['body', 'Read the instructions Claude follows'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMore((v) => (v === key ? null : key))}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white"
            >
              <Icon
                name={more === key ? 'expand_less' : 'expand_more'}
                className="text-[16px]"
              />
              {label}
            </button>
          ))}
        </div>
        {more === 'manual' && (
          <InstallSteps skill={skill} companyId={companyId} />
        )}
        {more === 'body' && (
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/[0.07] bg-black/30 p-4 font-mono text-[11px] leading-relaxed text-neutral-300">
            {skill.body}
          </pre>
        )}
      </div>
    </Panel>
  );
};

/** Adds a skill, or changes one, from its SKILL.md. */
const SkillEditor = ({
  open,
  onOpenChange,
  companyId,
  skill,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  skill: HiringSkillView | null;
  onSaved: () => void;
}) => {
  const [body, setBody] = useState('');
  const [tips, setTips] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBody(skill?.body ?? '');
    setTips(skill?.tips ?? '');
  }, [open, skill]);

  const parsed = body.trim() ? parseSkill(body) : null;
  const renamed = !!skill && !!parsed?.name && parsed.name !== skill.name;

  const save = async () => {
    setSaving(true);
    try {
      await PortalSdk.postData('/api/hiring/skills', { companyId, body, tips });
      toast.success('Skill saved');
      onSaved();
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
      onOpenChange={(next) => !saving && onOpenChange(next)}
      size="lg"
      icon="psychology"
      title={
        skill
          ? skill.builtIn
            ? `Customise ${skill.name}`
            : `Edit ${skill.name}`
          : 'Add a skill'
      }
      description="Paste the skill's SKILL.md. Your hiring leads install it from here."
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
            icon="save"
            loading={saving}
            disabled={!parsed || !!parsed.error}
            onClick={save}
          >
            Save
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field
          label="SKILL.md"
          hint={
            parsed?.error ??
            (parsed
              ? `${parsed.name}: ${parsed.description}`
              : 'Starts with --- then name: and description:, then ---, then the instructions. You can also ask Claude to save a skill here with its save_hiring_skill tool.')
          }
        >
          <TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              '---\nname: my-skill\ndescription: Use when …\n---\n\n# What Claude should do\n…'
            }
            className={cn(
              'min-h-[320px] font-mono text-[12px] leading-relaxed',
              parsed?.error && 'border-rose-500/40',
            )}
          />
        </Field>
        {renamed && (
          <p className="text-xs text-amber-200">
            The name changed, so this saves a new skill next to {skill?.name}.
          </p>
        )}
        <Field
          label="Tips for using it"
          hint="One per line: what to set up first, example asks, what to watch for."
        >
          <TextArea
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            className="min-h-[120px]"
          />
        </Field>
      </div>
    </AdminModal>
  );
};

/** The Skills section of the Hiring tab. */
export const HiringSkills = ({
  companyId,
  canEdit,
  users,
}: {
  companyId: string;
  canEdit: boolean;
  users: User[];
}) => {
  const [skills, setSkills] = useState<HiringSkillView[] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<HiringSkillView | null>(null);
  const [removing, setRemoving] = useState<HiringSkillView | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    PortalSdk.getData(`/api/hiring/skills?companyId=${companyId}`, null)
      .then((res) => setSkills(res?.data?.skills ?? []))
      .catch((err) => {
        setSkills([]);
        toast.error(errorText(err, 'Could not load skills.'));
      });
  }, [companyId]);

  useEffect(() => {
    setSkills(null);
    load();
  }, [load]);

  const nameOf = (id?: string | null) =>
    users.find((u) => u.id === id)?.name || 'a teammate';

  const remove = async () => {
    if (!removing?.id) return;
    setBusy(true);
    try {
      await PortalSdk.deleteData(`/api/hiring/skills/${removing.id}`, {});
      toast.success('Skill removed');
      setRemoving(null);
      load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-wrap items-center gap-4 p-4">
        <Icon name="psychology" className="text-[28px] text-violet-300" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-white">
            Claude skills for hiring
          </h2>
          <p className="text-sm text-neutral-400">
            A skill teaches Claude how this team hires. Copy a skill&apos;s
            install prompt and paste it into your Claude: it installs itself.
            Then just ask for the work (&ldquo;screen the applicants for the HR
            intern&rdquo;).
          </p>
        </div>
        {canEdit && (
          <AdminButton
            tone="primary"
            icon="add"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            Add skill
          </AdminButton>
        )}
      </Panel>

      {skills === null ? (
        <Panel>
          <SkeletonRows rows={3} />
        </Panel>
      ) : skills.length === 0 ? (
        <Panel>
          <EmptyState
            icon="psychology"
            title="No skills yet"
            description="Add a SKILL.md here, or ask Claude to save one with its save_hiring_skill tool."
          />
        </Panel>
      ) : (
        skills.map((skill) => (
          <SkillCard
            key={skill.id ?? `built-in-${skill.name}`}
            skill={skill}
            companyId={companyId}
            canEdit={canEdit}
            nameOf={nameOf}
            onEdit={() => {
              setEditing(skill);
              setEditorOpen(true);
            }}
            onDelete={() => setRemoving(skill)}
          />
        ))
      )}

      <SkillEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        companyId={companyId}
        skill={editing}
        onSaved={load}
      />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? 'skill'}?`}
        message="Hiring leads can't install it from here any more. Copies already installed keep working."
        confirmLabel="Remove"
        loading={busy}
        onConfirm={remove}
      />
    </div>
  );
};
