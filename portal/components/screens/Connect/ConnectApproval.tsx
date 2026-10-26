'use client';

import { useSearchParams } from 'next/navigation';
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
  const [info, setInfo] = useState<{ client: string; user: string } | null>(
    null,
  );
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
        }),
      )
      .catch((err) =>
        setError(err?.error ?? 'This connection link is not valid.'),
      );
  }, [clientId, redirectUri]);

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
            <p className="mt-1 text-sm text-neutral-500">
              It will work as{' '}
              <span className="font-medium text-neutral-800">{info.user}</span>{' '}
              and can:
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
