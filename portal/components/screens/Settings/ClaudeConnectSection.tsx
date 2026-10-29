'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

type Connection = {
  id: string;
  name: string;
  prefix: string;
  viaOAuth: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

const APPS = [
  { id: 'web', label: 'Claude app' },
  { id: 'code', label: 'Claude Code' },
] as const;

const copy = async (text: string, what = 'Copied') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(what);
  } catch {
    toast.error('Could not copy. Select it and copy by hand.');
  }
};

const CopyRow = ({ value, label }: { value: string; label: string }) => (
  <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2">
    <code className="min-w-0 flex-1 truncate text-xs text-neutral-800">
      {value}
    </code>
    <button
      onClick={() => copy(value)}
      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-200"
      aria-label={`Copy ${label}`}
    >
      Copy
    </button>
  </div>
);

// Works pasted into any Claude chat, and also reads fine as saved
// instructions. Keep the statuses in step with log_work's.
const WORKLOG_INSTRUCTIONS = `Log my work to the PORTAL work portal connector, simply.
- Everything in the portal is a task. What you log is a work point under one of my tasks.
- When you start something, call get_context and work out which of my tasks this session is about. Match by meaning, not just exact words: the same deliverable, project, repo or folder, or what its earlier points said. If one fits, log_work under it by naming it in point (its id), and keep using that task for the rest of the session.
- Only make a new task when none of my tasks (todayTasks or myTasks) is the same work. log_work then makes it in the project its words fit.
- At most 2-3 tasks per session, one per deliverable I'd mention in a standup. For example: making a video is one task, its thumbnails and upload pack is a second.
- Never make a new task for a revision, version, round or fix. Log on the same task instead (point + note, e.g. note "v6 rendered, 3 notes fixed"), so its history shows what happened when.
- Keep task names short and recognisable, 2-6 words I'd say out loud (e.g. "Rename Get into Zone extension"). Details go in the work points. Never make up a placeholder or random word as a task name.
- Log "doing" when you start, and "done", "not_done" or "blocked" when it ends. Use "waiting" only when the work is truly stopped until I act (a decision, approval, file or login only I can give), saying what I need to do. Not for finishing a reply, offering options or asking whether to continue: if you can keep going, it's "doing". Don't repeat a status that hasn't changed. When I've done my part, log it with byPerson so it shows as mine.
- Keep each point to one line about the outcome. Never include secrets or passwords.

First, save these instructions where every Claude chat on this computer reads them, not just this one. In Claude Code, add them to the global ~/.claude/CLAUDE.md (not a project's CLAUDE.md), creating the file if it doesn't exist, and keep anything already there. In the Claude app, remind me once to paste them into Settings > Profile > personal preferences. Then follow them here too. If the PORTAL connector isn't available, tell me to turn it on first.`;

const ago = (iso: string | null) => {
  if (!iso) return 'not used yet';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days < 1 ? 'used today' : `used ${days}d ago`;
};

/**
 * Connect Claude to the portal so it logs work as it goes. One URL works for
 * every Claude app; signing in happens in the browser.
 */
export const ClaudeConnectSection = () => {
  const [origin, setOrigin] = useState('');
  const [app, setApp] = useState<(typeof APPS)[number]['id']>('web');
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // People who hire also get the hiring tools and skill.
  const hires = useWorkspace().hiringCompanies.length > 0;

  useEffect(() => setOrigin(window.location.origin), []);
  const mcpUrl = `${origin}/api/mcp`;
  const skillUrl = `${origin}/claude/portal-worklog/SKILL.md`;
  const hiringSkillUrl = `${origin}/claude/portal-hiring/SKILL.md`;
  const codeCommand = `claude mcp add --transport http portal ${mcpUrl}`;
  const setupText = `Set up my work portal: run \`${codeCommand}\`, then download ${skillUrl} and save it as ~/.claude/skills/portal-worklog/SKILL.md${hires ? `, and download ${hiringSkillUrl} and save it as ~/.claude/skills/portal-hiring/SKILL.md` : ''}. After that, tell me to run /mcp to sign in to "portal".`;

  const load = useCallback(async () => {
    try {
      const res = await PortalSdk.getData('/api/me/tokens', null);
      setConnections(res?.data?.tokens ?? []);
    } catch {
      setConnections([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const disconnect = async (id: string) => {
    setBusy(id);
    try {
      await PortalSdk.deleteData('/api/me/tokens', { id });
      await load();
    } catch {
      toast.error('Could not disconnect. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const makeToken = async () => {
    setBusy('token');
    try {
      const res = await PortalSdk.postData('/api/me/tokens', {
        name: 'Token',
      });
      setNewToken(res?.data?.token ?? null);
      await load();
    } catch (err: any) {
      toast.error(err?.error ?? 'Could not make a token.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="mb-1 block text-xs font-semibold text-neutral-600">
          Portal connector URL
        </span>
        <CopyRow value={mcpUrl} label="connector URL" />
      </div>

      <div>
        <div className="mb-2 inline-flex rounded-lg bg-neutral-100 p-0.5">
          {APPS.map((a) => (
            <button
              key={a.id}
              onClick={() => setApp(a.id)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                app === a.id
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        {app === 'web' ? (
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-neutral-700">
            <li>In Claude (web or desktop), open Settings, then Connectors.</li>
            <li>
              Choose <b>Add custom connector</b>, name it Portal and paste the
              URL above.
            </li>
            <li>
              Press <b>Connect</b> and approve in the window that opens.
            </li>
          </ol>
        ) : (
          <div className="flex flex-col gap-2 text-sm text-neutral-700">
            <p>Run this, then type /mcp in Claude Code to sign in:</p>
            <CopyRow value={codeCommand} label="command" />
            <button
              onClick={() =>
                copy(setupText, 'Setup copied. Paste it to Claude Code.')
              }
              className="self-start text-xs font-medium text-neutral-900 hover:underline"
            >
              Or copy a message that sets it all up, skill included
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-neutral-500">
          Claude then logs its work in a Claude section of your worklog, tagged
          🟡 doing, ✅ done, ❌ not done, 🔴 blocked or ❓ waiting on you.{' '}
          <a
            href="/claude/portal-worklog/SKILL.md"
            target="_blank"
            className="font-medium text-neutral-900 hover:underline"
          >
            The skill
          </a>{' '}
          tells Claude when to log.
        </p>
        {hires && (
          <p className="mt-2 text-xs text-neutral-500">
            You hire, so Claude can also create job openings and their forms,
            review and shortlist applicants, and email them after you approve a
            preview.{' '}
            <a
              href="/claude/portal-hiring/SKILL.md"
              target="_blank"
              className="font-medium text-neutral-900 hover:underline"
            >
              The hiring skill
            </a>{' '}
            shows Claude how.
          </p>
        )}
      </div>

      <div>
        <span className="mb-1 block text-xs font-semibold text-neutral-600">
          Tell Claude to log your work
        </span>
        <p className="mb-2 text-sm text-neutral-700">
          Copy this message and paste it into any Claude chat. Claude saves it
          for every chat on that computer and starts logging right away.
        </p>
        <div className="relative rounded-lg bg-neutral-50 px-3 py-2">
          <pre className="whitespace-pre-wrap break-words pr-14 font-mono text-xs text-neutral-800">
            {WORKLOG_INSTRUCTIONS}
          </pre>
          <button
            onClick={() =>
              copy(WORKLOG_INSTRUCTIONS, 'Copied. Paste it into Claude.')
            }
            className="absolute right-2 top-2 rounded-md px-2 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-200"
            aria-label="Copy instructions"
          >
            Copy
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Claude Code saves it in <code>~/.claude/CLAUDE.md</code>, which every
          session on that computer reads. On claude.ai, paste it into Settings,
          Profile, personal preferences. Turn on the Portal connector wherever
          you use Claude too; without it the instructions do nothing.
        </p>
      </div>

      <div>
        <span className="mb-1 block text-xs font-semibold text-neutral-600">
          Connected
        </span>
        {connections === null ? (
          <div className="h-10 animate-pulse rounded-lg bg-neutral-50" />
        ) : connections.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing connected yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {connections.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{c.name}</span>
                  <span className="text-xs text-neutral-400">
                    {c.viaOAuth ? 'Connected' : `Token ${c.prefix}…`} ·{' '}
                    {ago(c.lastUsedAt)}
                  </span>
                </span>
                <button
                  onClick={() => disconnect(c.id)}
                  disabled={busy === c.id}
                  className="shrink-0 text-xs text-rose-600 hover:underline disabled:opacity-50"
                >
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-medium text-neutral-500">
          Using an app that needs a token instead?
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          {newToken ? (
            <>
              <p className="text-xs text-neutral-500">
                Copy it now; it won&apos;t be shown again. Send it as{' '}
                <code>Authorization: Bearer …</code>
              </p>
              <CopyRow value={newToken} label="token" />
            </>
          ) : (
            <button
              onClick={makeToken}
              disabled={busy === 'token'}
              className="self-start rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {busy === 'token' ? 'Making…' : 'Make a token'}
            </button>
          )}
        </div>
      </details>
    </div>
  );
};
