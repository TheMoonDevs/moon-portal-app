'use client';

import Link from 'next/link';
import { useState } from 'react';

import { answerBooking } from '@/components/screens/Meet/api';

/**
 * Approve, move or decline a meeting request right from the notification.
 * Moving needs a time picker, so it opens the Meet page.
 */
export const MeetRequestActions = ({
  bookingId,
  onDone,
}: {
  bookingId: string;
  onDone: () => void;
}) => {
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: 'approve' | 'decline') => {
    setBusy(action);
    setError(null);
    try {
      await answerBooking(bookingId, action);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      setConfirmDecline(false);
    }
  };

  return (
    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run('approve')}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {busy === 'approve' ? 'Approving…' : 'Approve'}
        </button>
        <Link
          href={`/meet?booking=${bookingId}&propose=1`}
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100"
        >
          Suggest new time
        </Link>
        <button
          type="button"
          disabled={!!busy}
          onClick={() =>
            confirmDecline ? run('decline') : setConfirmDecline(true)
          }
          onBlur={() => setConfirmDecline(false)}
          className={`rounded border px-3 py-1 text-sm transition disabled:opacity-50 ${
            confirmDecline
              ? 'border-red-600 bg-red-600 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          {busy === 'decline'
            ? 'Declining…'
            : confirmDecline
              ? 'Tap again to decline'
              : 'Decline'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};
