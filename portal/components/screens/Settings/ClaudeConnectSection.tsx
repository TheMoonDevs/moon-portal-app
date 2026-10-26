'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
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

  useEffect(() => setOrigin(window.location.origin), []);
  const mcpUrl = `${origin}/api/mcp`;
  const skillUrl = `${origin}/claude/portal-worklog/SKILL.md`;
  const codeCommand = `claude mcp add --transport http portal ${mcpUrl}`;
  const setupText = `Set up my work portal: run \`${codeCommand}\`, then download ${skillUrl} and save it as ~/.claude/skills/portal-worklog/SKILL.md. After that, tell me to run /mcp to sign in to "portal".`;

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
