'use client';

import { useState } from 'react';

import { useAuthSession } from '@/utils/hooks/useAuthSession';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

/**
 * Lets people link extra Google accounts to sign in with. Linking opens the
 * Google chooser, so only accounts they actually own can be added.
 */
export const SignInAccountsSection = ({ title }: { title: string }) => {
  const { user, googleEmail, refetchUser } = useUser();
  const { getGoogleIdToken } = useAuthSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const primary = user?.email?.toLowerCase() ?? null;
  const linked = (user?.linkedEmails ?? []).filter((e) => e !== primary);

  const link = async () => {
    setError(null);
    let idToken: string;
    try {
      idToken = await getGoogleIdToken();
    } catch {
      return;
    }
    setBusy('link');
    try {
      await PortalSdk.postData('/api/user/linked-emails', { idToken });
      await refetchUser();
    } catch (err: any) {
      setError(err?.error ?? 'Could not link that account.');
    } finally {
      setBusy(null);
    }
  };

  const unlink = async (email: string) => {
    setBusy(email);
    try {
      await PortalSdk.deleteData('/api/user/linked-emails', { email });
      await refetchUser();
    } catch (err: any) {
      setError(err?.error ?? 'Could not unlink that account.');
    } finally {
      setBusy(null);
    }
  };

  const Row = ({ email, tag }: { email: string; tag?: string }) => (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
      <span className="min-w-0 truncate text-sm">{email}</span>
      <span className="flex shrink-0 items-center gap-2">
        {email === googleEmail && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
            Signed in
          </span>
        )}
        {tag ? (
          <span className="text-xs text-neutral-400">{tag}</span>
        ) : (
          <button
            onClick={() => unlink(email)}
            disabled={busy === email}
            className="text-xs text-rose-600 hover:underline disabled:opacity-50"
          >
            Unlink
          </button>
        )}
      </span>
    </li>
  );

  return (
    <>
      <div className="mb-2 text-xl font-bold">
        <span>{title}</span>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Sign in with your code and any of these Google accounts.
      </p>
      <ul className="mb-4 flex flex-col gap-2">
        {primary && <Row email={primary} tag="Main" />}
        {linked.map((email) => (
          <Row key={email} email={email} />
        ))}
      </ul>
      <button
        onClick={link}
        disabled={busy === 'link'}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {busy === 'link' ? 'Linking…' : 'Link another Google account'}
      </button>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </>
  );
};
