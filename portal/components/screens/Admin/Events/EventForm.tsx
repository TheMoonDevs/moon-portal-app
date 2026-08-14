'use client';

import type { Event } from '@db/client';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  ConfirmDialog,
  DateInput,
  EmptyState,
  Field,
  formatDate,
  Panel,
  SearchInput,
  Segmented,
  SkeletonRows,
  StatCard,
  TextArea,
  TextInput,
} from '../shared/AdminUI';
import { EventCard } from './EventCard';

type EventFormState = {
  title: string;
  subTitle: string;
  link: string;
  date: string;
  time: string;
};

const EMPTY_FORM: EventFormState = {
  title: '',
  subTitle: '',
  link: '',
  date: '',
  time: '',
};

type EventFilter = 'UPCOMING' | 'PAST' | 'ALL';

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const EventForm = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<EventFilter>('UPCOMING');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* --------------------------------- fetch --------------------------------- */

  const fetchEvents = useCallback(async () => {
    setFetching(true);
    try {
      const response = await PortalSdk.getData('/api/events', null);
      setEvents(response?.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Could not load events');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /* -------------------------------- derived -------------------------------- */

  const { upcoming, past } = useMemo(() => {
    const today = startOfToday();
    return {
      upcoming: events.filter((event) => new Date(event.date) >= today),
      past: events.filter((event) => new Date(event.date) < today),
    };
  }, [events]);

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base =
      filter === 'UPCOMING' ? upcoming : filter === 'PAST' ? past : events;

    return base
      .filter((event) =>
        term
          ? [event.name, event.subTitle]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(term))
          : true,
      )
      .sort((a, b) => {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return filter === 'PAST' ? -diff : diff;
      });
  }, [filter, search, upcoming, past, events]);

  /* ---------------------------------- form ---------------------------------- */

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (event: Event) => {
    setForm({
      title: event.name || '',
      subTitle: event.subTitle || '',
      link: event.link || '',
      date: event.date || '',
      time: event.time || '',
    });
    setEditingId(event.id);
    setFormOpen(true);
  };

  const isValid =
    form.title.trim() !== '' &&
    form.subTitle.trim() !== '' &&
    form.link.trim() !== '' &&
    form.date !== '' &&
    form.time !== '';

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!isValid || saving) return;

    const date = new Date(form.date);
    const payload = {
      title: form.title.trim(),
      subTitle: form.subTitle.trim(),
      link: form.link.trim(),
      date: form.date,
      time: form.time,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await PortalSdk.putData('/api/events', { ...payload, id: editingId });
        toast.success('Event updated');
      } else {
        await PortalSdk.postData('/api/events', payload);
        toast.success('Event added');
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchEvents();
    } catch (error) {
      console.error(error);
      toast.error(editingId ? 'Could not update event' : 'Could not add event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await PortalSdk.deleteData('/api/events', { id: deleteTarget.id });
      setEvents((previous) =>
        previous.filter((event) => event.id !== deleteTarget.id),
      );
      toast.success('Event deleted');
      setDeleteTarget(null);
    } catch (error) {
      console.error(error);
      toast.error('Could not delete event');
    } finally {
      setDeleting(false);
    }
  };

  /* --------------------------------- render --------------------------------- */

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="All events"
          value={events.length}
          icon="event"
          loading={fetching}
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          icon="event_upcoming"
          tone="positive"
          hint={
            upcoming.length > 0
              ? `Next on ${formatDate(upcoming[0]?.date)}`
              : 'Nothing scheduled'
          }
          loading={fetching}
        />
        <StatCard
          label="Past"
          value={past.length}
          icon="history"
          tone="neutral"
          loading={fetching}
        />
      </div>

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search events…"
            className="min-w-[220px] flex-1"
          />
          <Segmented<EventFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'UPCOMING', label: 'Upcoming', count: upcoming.length },
              { value: 'PAST', label: 'Past', count: past.length },
              { value: 'ALL', label: 'All', count: events.length },
            ]}
          />
          <AdminButton tone="primary" icon="add" onClick={openCreate}>
            New event
          </AdminButton>
        </div>

        {fetching ? (
          <SkeletonRows rows={5} />
        ) : visibleEvents.length === 0 ? (
          <EmptyState
            icon={search ? 'search_off' : 'event_busy'}
            title={
              search
                ? 'No events match your search'
                : filter === 'UPCOMING'
                  ? 'No upcoming events'
                  : 'No events yet'
            }
            description={
              search
                ? 'Try a different title or subtitle.'
                : 'Schedule an event to show it on the portal calendar.'
            }
            action={
              !search ? (
                <AdminButton
                  size="sm"
                  tone="primary"
                  icon="add"
                  onClick={openCreate}
                >
                  New event
                </AdminButton>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {visibleEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isPast={new Date(event.date) < startOfToday()}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        )}
      </Panel>

      <AdminModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setForm(EMPTY_FORM);
            setEditingId(null);
          }
        }}
        title={editingId ? 'Edit event' : 'New event'}
        description="Events appear on the portal calendar for everyone."
        icon="event"
        footer={
          <>
            <AdminButton
              tone="ghost"
              size="sm"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              icon="check"
              loading={saving}
              disabled={!isValid}
              onClick={() => handleSubmit()}
            >
              {editingId ? 'Save changes' : 'Add event'}
            </AdminButton>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Title" htmlFor="event-title" required>
            <TextInput
              id="event-title"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="e.g. Monthly all-hands"
            />
          </Field>

          <Field label="Subtitle" htmlFor="event-subtitle" required>
            <TextArea
              id="event-subtitle"
              value={form.subTitle}
              onChange={(event) =>
                setForm({ ...form, subTitle: event.target.value })
              }
              placeholder="A short line describing the event…"
              className="min-h-[80px]"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="event-date" required>
              <DateInput
                id="event-date"
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
              />
            </Field>
            <Field label="Time" htmlFor="event-time" required>
              <TextInput
                id="event-time"
                type="time"
                value={form.time}
                onChange={(event) =>
                  setForm({ ...form, time: event.target.value })
                }
                className="[color-scheme:dark]"
              />
            </Field>
          </div>

          <Field
            label="Link"
            htmlFor="event-link"
            required
            hint="Meeting or details link shown with the event."
          >
            <TextInput
              id="event-link"
              type="url"
              value={form.link}
              onChange={(event) =>
                setForm({ ...form, link: event.target.value })
              }
              placeholder="https://…"
            />
          </Field>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete “${deleteTarget?.name ?? ''}”?`}
        description="The event will be removed from the portal calendar."
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default EventForm;
