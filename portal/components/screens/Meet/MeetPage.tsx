'use client';

import { isEqual } from 'lodash';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

import {
  AdminButton,
  ConfirmDialog,
  CopyButton,
  Icon,
  Panel,
  Spin,
  ToggleSwitch,
} from '../Admin/shared/AdminUI';
import { type HostBooking, meetApi, type ProfileResponse } from './api';
import { AvailabilityEditor, type MeetSettings } from './AvailabilityEditor';
import { BookingsList } from './BookingsList';

const settingsOf = (p: ProfileResponse['profile']): MeetSettings => ({
  title: p.title ?? '',
  description: p.description ?? '',
  durationMinutes: p.durationMinutes,
  bufferMinutes: p.bufferMinutes,
  minNoticeHours: p.minNoticeHours,
  maxDaysAhead: p.maxDaysAhead,
  dailyLimit: p.dailyLimit,
  timezone: p.timezone,
  weekly: p.weekly,
  daysOff: p.daysOff ?? [],
  meetingUrl: p.meetingUrl ?? '',
  requiresApproval: p.requiresApproval,
});

/** The signed-in user's booking link, its settings and their meetings. */
export const MeetPage = () => {
  const params = useSearchParams();
  const focusId = params?.get('booking') ?? null;
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [settings, setSettings] = useState<MeetSettings | null>(null);
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmNewCode, setConfirmNewCode] = useState(false);
  const [newCodeLoading, setNewCodeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    meetApi<ProfileResponse>('/api/meet/profile')
      .then((res) => {
        setData(res);
        setSettings(settingsOf(res.profile));
      })
      .catch((e) => setError((e as Error).message));
    meetApi<{ bookings: HostBooking[] }>('/api/meet/bookings')
      .then((res) => setBookings(res.bookings))
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoadingBookings(false));
  }, []);

  const dirty =
    !!data && !!settings && !isEqual(settings, settingsOf(data.profile));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await meetApi<ProfileResponse>(
        '/api/meet/profile',
        'PUT',
        settings,
      );
      setData(res);
      setSettings(settingsOf(res.profile));
      toast.success('Saved. Your link shows the new times now.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (isActive: boolean) => {
    setToggling(true);
    try {
      const res = await meetApi<ProfileResponse>('/api/meet/profile', 'PUT', {
        isActive,
      });
      setData(res);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setToggling(false);
    }
  };

  const newCode = async () => {
    setNewCodeLoading(true);
    try {
      const res = await meetApi<ProfileResponse>(
        '/api/meet/profile/code',
        'POST',
        {},
      );
      setData(res);
      toast.success('New link ready. The old one no longer works.');
      setConfirmNewCode(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setNewCodeLoading(false);
    }
  };

  const share = async () => {
    if (!data) return;
    try {
      await navigator.share({
        title: 'Book a meeting with me',
        url: data.link,
      });
    } catch {
      /* the person closed the share sheet */
    }
  };

  if (error)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-950 text-sm text-rose-300">
        {error}
      </div>
    );
  if (!data || !settings)
    return (
      <div className="flex min-h-dvh items-center justify-center gap-2 bg-neutral-950 text-sm text-neutral-400">
        <Spin /> Loading…
      </div>
    );

  const { profile, link } = data;

  return (
    <div className="min-h-dvh bg-neutral-950 pb-28 text-neutral-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Meet with me
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Share your link with candidates or teammates. They pick a free time,
            you approve it, and everyone gets the meeting link and a calendar
            invite by email.
          </p>
        </header>

        <Panel className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2.5">
              <Icon name="link" className="text-[18px] text-neutral-400" />
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className={`truncate text-sm ${profile.isActive ? 'text-white' : 'text-neutral-500 line-through'}`}
              >
                {link}
              </a>
              <CopyButton value={link} label="Copy link" className="ml-auto" />
            </div>
            <div className="flex gap-2">
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <AdminButton icon="ios_share" onClick={share}>
                  Share
                </AdminButton>
              )}
              <AdminButton
                tone="ghost"
                icon="autorenew"
                onClick={() => setConfirmNewCode(true)}
              >
                New code
              </AdminButton>
            </div>
          </div>
          <ToggleSwitch
            checked={profile.isActive}
            disabled={toggling}
            onChange={setActive}
            label={profile.isActive ? 'Taking meetings' : 'Paused'}
            description={
              profile.isActive
                ? 'Anyone with the link can ask for a time.'
                : 'The link says you aren’t taking meetings right now.'
            }
          />
          <p className="text-xs text-neutral-500">
            Hiring emails can use{' '}
            <code className="text-neutral-300">{'{{meetingLink}}'}</code> to
            send each candidate this link with their name and email filled in.
          </p>
        </Panel>

        <BookingsList
          bookings={bookings}
          timezone={profile.timezone}
          loading={loadingBookings}
          focusId={focusId}
          openPropose={params?.get('propose') === '1'}
          onChanged={(updated) =>
            setBookings((list) =>
              list.map((b) => (b.id === updated.id ? updated : b)),
            )
          }
        />

        <AvailabilityEditor settings={settings} onChange={setSettings} />
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-20 z-20 flex justify-center px-4 md:bottom-6 md:pl-24">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-2.5 shadow-2xl shadow-black/60">
            <p className="text-sm text-neutral-300">Unsaved changes</p>
            <AdminButton
              size="sm"
              tone="ghost"
              onClick={() => setSettings(settingsOf(profile))}
            >
              Undo
            </AdminButton>
            <AdminButton
              size="sm"
              tone="primary"
              loading={saving}
              onClick={save}
            >
              Save
            </AdminButton>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmNewCode}
        onOpenChange={setConfirmNewCode}
        title="Get a new link?"
        message="Your current link stops working straight away, like resetting an invite code. Meetings already booked stay as they are."
        confirmLabel="Get new link"
        loading={newCodeLoading}
        onConfirm={newCode}
      />
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
};
