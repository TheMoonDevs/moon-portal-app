'use client';

import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { PortalSdk } from '@/utils/services/PortalSdk';

const CAN_DO = [
  'Log work points in your worklog, tagged doing, done or not done',
  'See your companies, projects, goals and tasks',
  'Add tasks for you and move them along',
];

/** "Let Claude log your work?" A person approves an assistant here. */
export const ConnectApproval = () => {
  const params = useSearchParams();
  const [info, setInfo] = useState<{
    client: string;
    user: string;
    email: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clientId = params?.get('client_id') ?? '';
  const redirectUri = params?.get('redirect_uri') ?? '';

  useEffect(() => {
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
    });
    PortalSdk.getData(`/api/oauth/authorize?${query}`, null)
      .then((res) =>
        setInfo({
          client: res?.data?.client?.name ?? 'An app',
          user: res?.data?.user?.name ?? '',
          email: res?.data?.user?.email ?? null,
        }),
      )
      .catch((err) =>
        setError(err?.error ?? 'This connection link is not valid.'),
      );
  }, [clientId, redirectUri]);

  // Connect a different portal account: sign out here, then come straight
  // back to this screen after signing in again.
  const switchAccount = () => {
    setBusy(true);
    const back = `${window.location.pathname}${window.location.search}`;
    signOut({ callbackUrl: `/login?uri=${encodeURIComponent(back)}` });
  };

  const answer = async (approve: boolean) => {
    setBusy(true);
    try {
      const res = await PortalSdk.postData('/api/oauth/authorize', {
        approve,
        client_id: clientId,
        redirect_uri: redirectUri,
        state: params?.get('state') ?? undefined,
        code_challenge: params?.get('code_challenge') ?? undefined,
        code_challenge_method:
          params?.get('code_challenge_method') ?? undefined,
      });
      window.location.href = res.data.redirect;
    } catch (err: any) {
      setError(err?.error ?? 'Could not finish connecting. Try again.');
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-neutral-900">
          <span className="material-icons !text-2xl text-white">smart_toy</span>
        </div>
        {error ? (
          <>
            <h1 className="text-lg font-bold text-neutral-900">
              Can&apos;t connect
            </h1>
            <p className="mt-1 text-sm text-neutral-500">{error}</p>
          </>
        ) : !info ? (
          <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />
        ) : (
          <>
            <h1 className="text-lg font-bold text-neutral-900">
              Connect {info.client} to your portal?
            </h1>
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2">
              <span className="material-icons !text-xl text-neutral-500">
                account_circle
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800">
                  {info.user}
                </p>
                {info.email && (
                  <p className="truncate text-xs text-neutral-500">
                    {info.email}
                  </p>
                )}
              </div>
              <button
                onClick={switchAccount}
                disabled={busy}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50"
              >
                Use another account
              </button>
            </div>
            <p className="mt-3 text-sm text-neutral-500">
              It will work as this portal account, whatever email you use for
              Claude, and can:
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {CAN_DO.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 text-sm text-neutral-700"
                >
                  <span className="material-icons !text-base text-emerald-600">
                    check
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-neutral-400">
              You can disconnect it any time in Settings.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => answer(false)}
                disabled={busy}
                className="h-10 flex-1 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => answer(true)}
                disabled={busy}
                className="h-10 flex-1 rounded-lg bg-neutral-900 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {busy ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};
