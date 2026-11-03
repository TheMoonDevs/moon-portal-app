'use client';

import { isEqual } from 'lodash';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { ThemeToggle } from '@/components/global/ThemeToggle';

import {
  AdminButton,
  ConfirmDialog,
  Icon,
  Spin,
  ToggleSwitch,
} from '../Admin/shared/AdminUI';
import { type HostBooking, meetApi, type ProfileResponse } from './api';
import { AvailabilityEditor, type MeetSettings } from './AvailabilityEditor';
import { BookingsList } from './BookingsList';
import { MeetCalendar } from './MeetCalendar';
import { MeetSection } from './MeetSection';
import { useResolvedTheme } from './useResolvedTheme';

/** The big white copy button next to the link. */
const CopyLinkButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <AdminButton
      tone="primary"
      icon={copied ? 'check' : 'content_copy'}
      className="h-11 flex-1 px-4 sm:flex-none"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error('Couldn’t copy. Select the link and copy it instead.');
        }
      }}
    >
      {copied ? 'Copied' : 'Copy link'}
    </AdminButton>
  );
};

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
  const [selectedId, setSelectedId] = useState<string | null>(
    params?.get('booking') ?? null,
  );
  const [canShare, setCanShare] = useState(false);
  const theme = useResolvedTheme();
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
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
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
      <div className="auto-theme flex min-h-dvh items-center justify-center bg-neutral-950 text-sm text-rose-300 auto-light:bg-neutral-50 auto-light:text-rose-600">
        {error}
      </div>
    );
  if (!data || !settings)
    return (
      <div className="auto-theme flex min-h-dvh items-center justify-center gap-2 bg-neutral-950 text-sm text-neutral-400 auto-light:bg-neutral-50 auto-light:text-neutral-500">
        <Spin /> Loading…
      </div>
    );

  const { profile, link } = data;

  return (
    <div className="auto-theme min-h-dvh bg-neutral-950 pb-28 text-neutral-100 auto-light:bg-neutral-50 auto-light:text-neutral-900 md:pb-10">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-6 md:px-6">
        {/* The link is what this page is for: big, at the top, one tap to copy. */}
        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 to-neutral-900/40 p-4 auto-light:border-black/10 auto-light:from-white auto-light:to-neutral-100 md:p-5 lg:flex-row lg:items-center">
          <div className="min-w-0 lg:w-56 lg:shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-white auto-light:text-neutral-950">
                Meet with me
              </h1>
              <ThemeToggle />
            </div>
            <p className="mt-0.5 text-xs text-neutral-400 auto-light:text-neutral-500">
              Share this link. Guests pick an open time
              {settings.requiresApproval ? ' and you approve it' : ''}.
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-black/40 px-4 py-3 transition-colors hover:border-white/25 auto-light:border-black/10 auto-light:bg-neutral-50 auto-light:hover:border-black/25 ${profile.isActive ? 'text-white auto-light:text-neutral-950' : 'text-neutral-500'}`}
            >
              <Icon
                name="link"
                className="text-[20px] text-neutral-400 auto-light:text-neutral-500"
              />
              <span
                className={`truncate font-mono text-sm md:text-base ${profile.isActive ? '' : 'line-through'}`}
              >
                {link.replace(/^https?:\/\//, '')}
              </span>
            </a>
            <div className="flex gap-2">
              <CopyLinkButton value={link} />
              {canShare && (
                <AdminButton
                  icon="ios_share"
                  onClick={share}
                  className="h-11 flex-1 sm:flex-none"
                >
                  Share
                </AdminButton>
              )}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={profile.isActive}
            disabled={toggling}
            onClick={() => setActive(!profile.isActive)}
            className={`flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              profile.isActive
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15 auto-light:border-emerald-500/40 auto-light:text-emerald-800'
                : 'border-white/10 bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] auto-light:border-black/10 auto-light:bg-black/[0.03] auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06]'
            }`}
          >
            <span
              className={`size-2 rounded-full ${profile.isActive ? 'bg-emerald-400' : 'bg-neutral-500'}`}
            />
            {profile.isActive ? 'Taking meetings' : 'Paused'}
          </button>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <MeetCalendar
            bookings={bookings}
            settings={settings}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:pb-2 lg:pr-1">
            <BookingsList
              bookings={bookings}
              timezone={profile.timezone}
              loading={loadingBookings}
              focusId={selectedId}
              openPropose={params?.get('propose') === '1'}
              onSelect={setSelectedId}
              onChanged={(updated) =>
                setBookings((list) =>
                  list.map((b) => (b.id === updated.id ? updated : b)),
                )
              }
            />

            <AvailabilityEditor settings={settings} onChange={setSettings} />

            <MeetSection
              icon="link"
              title="Your link"
              description={
                profile.isActive
                  ? 'Anyone with the link can ask for a time'
                  : 'Paused: the link says you aren’t taking meetings'
              }
            >
              <div className="flex flex-col gap-3">
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
                <AdminButton
                  tone="secondary"
                  icon="autorenew"
                  onClick={() => setConfirmNewCode(true)}
                  className="self-start"
                >
                  Get a new link
                </AdminButton>
                <p className="text-xs text-neutral-500">
                  Hiring emails can use{' '}
                  <code className="text-neutral-300 auto-light:text-neutral-700">
                    {'{{meetingLink}}'}
                  </code>{' '}
                  to send each candidate this link with their name and email
                  filled in.
                </p>
              </div>
            </MeetSection>
          </aside>
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-20 z-20 flex justify-center px-4 md:bottom-6 md:pl-16">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-2.5 shadow-2xl shadow-black/60 auto-light:border-black/10 auto-light:bg-white auto-light:shadow-black/10">
            <p className="text-sm text-neutral-300 auto-light:text-neutral-700">
              Unsaved changes
            </p>
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
        autoTheme
        open={confirmNewCode}
        onOpenChange={setConfirmNewCode}
        title="Get a new link?"
        message="Your current link stops working straight away, like resetting an invite code. Meetings already booked stay as they are."
        confirmLabel="Get new link"
        loading={newCodeLoading}
        onConfirm={newCode}
      />
      <Toaster position="top-center" richColors theme={theme} />
    </div>
  );
};
