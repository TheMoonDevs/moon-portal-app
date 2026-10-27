'use client';

import { useMemo, useState } from 'react';

import {
  BUFFER_OPTIONS,
  DAILY_LIMIT_OPTIONS,
  DURATION_OPTIONS,
  MAX_DESCRIPTION,
  MAX_TITLE,
  NOTICE_OPTIONS,
  WEEKDAYS,
  WINDOW_OPTIONS,
} from '@/lib/meet/rules';
import { allTimezones, dateIn, timezoneLabel } from '@/lib/meet/time';
import type { MeetProfile, MeetTimeRange } from '@/models/meet';

import {
  AdminButton,
  DateInput,
  Field,
  Icon,
  IconAction,
  NativeSelect,
  Panel,
  PanelHeader,
  TextArea,
  TextInput,
  ToggleSwitch,
} from '../Admin/shared/AdminUI';

export type MeetSettings = Pick<
  MeetProfile,
  | 'title'
  | 'description'
  | 'durationMinutes'
  | 'bufferMinutes'
  | 'minNoticeHours'
  | 'maxDaysAhead'
  | 'dailyLimit'
  | 'timezone'
  | 'weekly'
  | 'daysOff'
  | 'meetingUrl'
  | 'requiresApproval'
>;

// Monday first reads better; storage stays Sunday first.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const hours = (n: number) =>
  n < 24
    ? `${n} hour${n === 1 ? '' : 's'}`
    : `${n / 24} day${n === 24 ? '' : 's'}`;

const timeClass =
  'h-9 w-[104px] rounded-lg border border-white/10 bg-neutral-900/80 px-2 text-sm text-neutral-100 [color-scheme:dark] focus:border-white/25 focus:outline-none';

const DayRow = ({
  day,
  ranges,
  onChange,
}: {
  day: number;
  ranges: MeetTimeRange[];
  onChange: (ranges: MeetTimeRange[]) => void;
}) => {
  const on = ranges.length > 0;
  const lastEnd = ranges[ranges.length - 1]?.end ?? '09:00';
  return (
    <div className="flex flex-col gap-2 border-b border-white/[0.05] py-3 last:border-0 sm:flex-row sm:items-start">
      <label className="flex w-36 shrink-0 cursor-pointer items-center gap-2 pt-1.5 text-sm text-neutral-200">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) =>
            onChange(e.target.checked ? [{ start: '10:00', end: '18:00' }] : [])
          }
          className="size-4 accent-white"
        />
        {WEEKDAYS[day]}
      </label>
      {on ? (
        <div className="flex flex-col gap-2">
          {ranges.map((range, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="time"
                value={range.start}
                step={900}
                className={timeClass}
                onChange={(e) =>
                  onChange(
                    ranges.map((r, j) =>
                      j === i ? { ...r, start: e.target.value } : r,
                    ),
                  )
                }
              />
              <span className="text-neutral-500">–</span>
              <input
                type="time"
                value={range.end}
                step={900}
                className={timeClass}
                onChange={(e) =>
                  onChange(
                    ranges.map((r, j) =>
                      j === i ? { ...r, end: e.target.value } : r,
                    ),
                  )
                }
              />
              <IconAction
                icon="close"
                label="Remove these hours"
                onClick={() => onChange(ranges.filter((_, j) => j !== i))}
              />
              {i === ranges.length - 1 &&
                ranges.length < 4 &&
                lastEnd < '23:00' && (
                  <IconAction
                    icon="add"
                    label="Add hours (e.g. after a lunch break)"
                    onClick={() => {
                      const [h] = lastEnd.split(':').map(Number);
                      const start = `${String(Math.min(h + 1, 22)).padStart(2, '0')}:00`;
                      const end = `${String(Math.min(h + 3, 23)).padStart(2, '0')}:00`;
                      onChange([...ranges, { start, end }]);
                    }}
                  />
                )}
            </div>
          ))}
        </div>
      ) : (
        <p className="pt-1.5 text-sm text-neutral-600">Unavailable</p>
      )}
    </div>
  );
};

export const AvailabilityEditor = ({
  settings,
  onChange,
}: {
  settings: MeetSettings;
  onChange: (next: MeetSettings) => void;
}) => {
  const [dayOff, setDayOff] = useState('');
  const zones = useMemo(() => allTimezones(), []);
  const set = <K extends keyof MeetSettings>(key: K, value: MeetSettings[K]) =>
    onChange({ ...settings, [key]: value });
  const today = dateIn(new Date(), settings.timezone);
  const upcomingDaysOff = settings.daysOff.filter((d) => d >= today);

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader
          icon="calendar_month"
          title="When you can meet"
          description="Guests only see times inside these hours."
          className="border-b border-white/[0.07] p-4"
        />
        <div className="flex flex-col gap-4 p-4">
          <Field label="Your timezone" htmlFor="meet-host-tz">
            <NativeSelect
              id="meet-host-tz"
              value={settings.timezone}
              onChange={(e) => set('timezone', e.target.value)}
            >
              {(zones.includes(settings.timezone)
                ? zones
                : [settings.timezone, ...zones]
              ).map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')} ({timezoneLabel(tz)})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div>
            {DAY_ORDER.map((day) => (
              <DayRow
                key={day}
                day={day}
                ranges={settings.weekly[day] ?? []}
                onChange={(ranges) =>
                  set(
                    'weekly',
                    settings.weekly.map((r, i) => (i === day ? ranges : r)),
                  )
                }
              />
            ))}
          </div>
          <Field
            label="Days off"
            hint="Holidays, leave, travel: no meetings on these dates."
          >
            <div className="flex gap-2">
              <DateInput
                value={dayOff}
                min={today}
                onChange={(e) => setDayOff(e.target.value)}
                className="max-w-[200px]"
              />
              <AdminButton
                size="md"
                icon="add"
                disabled={!dayOff || settings.daysOff.includes(dayOff)}
                onClick={() => {
                  set('daysOff', [...settings.daysOff, dayOff].sort());
                  setDayOff('');
                }}
              >
                Add
              </AdminButton>
            </div>
            {upcomingDaysOff.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {upcomingDaysOff.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] py-0.5 pl-2.5 pr-1 text-xs text-neutral-200"
                  >
                    {new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'UTC',
                    })}
                    <button
                      type="button"
                      aria-label="Remove day off"
                      className="flex size-5 items-center justify-center rounded-full text-[14px] text-neutral-400 hover:bg-white/10 hover:text-white"
                      onClick={() =>
                        set(
                          'daysOff',
                          settings.daysOff.filter((x) => x !== d),
                        )
                      }
                    >
                      <Icon name="close" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          icon="tune"
          title="Meeting rules"
          className="border-b border-white/[0.07] p-4"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Meeting length">
            <NativeSelect
              value={settings.durationMinutes}
              onChange={(e) => set('durationMinutes', Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} minutes
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Break between meetings">
            <NativeSelect
              value={settings.bufferMinutes}
              onChange={(e) => set('bufferMinutes', Number(e.target.value))}
            >
              {BUFFER_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n ? `${n} minutes` : 'None'}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Minimum notice">
            <NativeSelect
              value={settings.minNoticeHours}
              onChange={(e) => set('minNoticeHours', Number(e.target.value))}
            >
              {NOTICE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {hours(n)} ahead
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Bookable up to">
            <NativeSelect
              value={settings.maxDaysAhead}
              onChange={(e) => set('maxDaysAhead', Number(e.target.value))}
            >
              {WINDOW_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} days ahead
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Most meetings a day">
            <NativeSelect
              value={settings.dailyLimit}
              onChange={(e) => set('dailyLimit', Number(e.target.value))}
            >
              {DAILY_LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n || 'No limit'}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Your meeting room"
            hint="Google Meet, Zoom or Teams link. Empty: a new Jitsi room per meeting."
          >
            <TextInput
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={settings.meetingUrl ?? ''}
              onChange={(e) => set('meetingUrl', e.target.value)}
            />
          </Field>
          <ToggleSwitch
            className="sm:col-span-2"
            checked={settings.requiresApproval}
            onChange={(v) => set('requiresApproval', v)}
            label="Approve each request"
            description={
              settings.requiresApproval
                ? 'Requests wait in your notifications until you approve, move or decline them.'
                : 'Bookings are confirmed straight away. You can still cancel.'
            }
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          icon="badge"
          title="What guests see"
          className="border-b border-white/[0.07] p-4"
        />
        <div className="flex flex-col gap-4 p-4">
          <Field label="Title" hint="Leave empty for “Meet <your name>”.">
            <TextInput
              maxLength={MAX_TITLE}
              placeholder="Interview with The Moon Devs"
              value={settings.title ?? ''}
              onChange={(e) => set('title', e.target.value)}
            />
          </Field>
          <Field label="Description">
            <TextArea
              rows={3}
              maxLength={MAX_DESCRIPTION}
              placeholder="A short call to get to know each other. Bring any questions!"
              value={settings.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
};
