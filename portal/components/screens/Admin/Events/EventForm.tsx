'use client';
import React, { useEffect, useState } from 'react';
import { MobileBox } from '../../Login/Login';
import { Spinner } from '@/components/elements/Loaders';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { toast, Toaster } from 'sonner';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Event } from '@prisma/client';
import { IconButton } from '@mui/material';
import ToolTip from '@/components/elements/ToolTip';
import { EventCard } from './EventCard';

export type loadingState = {
  addNew: boolean;
  fetching: boolean;
  adding: boolean;
  updating: boolean;
  updateUploading: boolean;
};

const EventForm = () => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [link, setLink] = useState('');
  const [date, setDate] = useState<Dayjs | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [time, setTime] = useState<Dayjs | null>(null);
  const [loadingState, setLoadingState] = useState<loadingState>({
    addNew: false,
    fetching: false,
    adding: false,
    updating: false,
    updateUploading: false,
  });

  const resetForm = () => {
    setTitle('');
    setSubTitle('');
    setLink('');
    setDate(null);
    setTime(null);
  };

  const getEvents = async () => {
    setLoadingState({ ...loadingState, fetching: true });
    try {
      const res = await PortalSdk.getData('/api/events', null);
      setEvents(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingState({ ...loadingState, fetching: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !title || !subTitle || !link || !time) return;
    const formattedDate = date.format('DD-MM-YYYY');
    const formattedTime = time.format('HH:mm');
    const year = date.year();
    const month = Number(date.format('M'));
    const eventData = {
      title,
      subTitle,
      link,
      date: formattedDate,
      time: formattedTime,
      month,
      year,
    };
    setLoadingState({ ...loadingState, adding: true });
    console.log(eventData);

    try {
      await PortalSdk.postData('api/events', eventData);
      toast.success('Event added successfully!');
      resetForm();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to add event. Please try again.');
    } finally {
      setLoadingState({ ...loadingState, adding: false });
    }
  };

  const handleUpdate = async (event: Event, e: React.FormEvent) => {
    e.preventDefault();
    setLoadingState((prev) => ({ ...prev, updateUploading: true }));
    if (!date || !title || !subTitle || !link || !time) return;
    const formattedDate = date.format('DD-MM-YYYY');
    const formattedTime = time.format('HH:mm');
    const year = date.year();
    const month = Number(date.format('M'));
    const eventData = {
      id: event.id,
      title,
      subTitle,
      link,
      date: formattedDate,
      time: formattedTime,
      month,
      year,
    };

    try {
      await PortalSdk.putData('api/events', eventData);
      toast.success('Event updated successfully!');
      resetForm();
      setLoadingState((prev) => ({ ...prev, updating: true }));
      getEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event. Please try again.');
    } finally {
      setLoadingState((prev) => ({ ...prev, updateUploading: false }));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    if (loadingState.updating) {
      handleUpdate(selectedEvent as Event, e);
    } else {
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      setTitle(selectedEvent.name || '');
      setSubTitle(selectedEvent.subTitle || '');
      setLink(selectedEvent.link || '');
      setDate(dayjs(selectedEvent.date, 'DD-MM-YYYY') || null);
      setTime(dayjs(selectedEvent.time, 'HH:mm') || null);
    } else {
      resetForm();
    }
  }, [selectedEvent]);

  useEffect(() => {
    getEvents();
  }, []);

  return (
    <>
      <MobileBox
        customClass={`${loadingState.addNew || loadingState.updating ? 'overflow-y-scroll' : 'overflow-hidden'} !w-[50%]`}
      >
        <p className="mb-6 text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
          Add Event
        </p>
        {loadingState.fetching ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="relative h-full w-full">
            {loadingState.addNew || loadingState.updating ? (
              <>
                <ToolTip title="Back to Previous Slide">
                  <IconButton
                    onClick={() => {
                      loadingState.updating
                        ? setLoadingState({ ...loadingState, updating: false })
                        : setLoadingState({ ...loadingState, addNew: false });
                      resetForm();
                    }}
                    sx={{ backgroundColor: '#1b1b1b', mb: 2 }}
                  >
                    <span className="material-symbols-outlined !text-white">
                      arrow_back
                    </span>
                  </IconButton>
                </ToolTip>
                <form
                  onSubmit={handleFormSubmit}
                  className="relative my-2 flex h-full w-full flex-grow flex-col"
                >
                  <div className="flex-grow">
                    <div className="mb-5">
                      <label
                        htmlFor="eventTitle"
                        className="mb-1 block text-sm font-medium text-neutral-300"
                      >
                        Event Title
                      </label>
                      <input
                        type="text"
                        id="eventTitle"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
                        placeholder="Enter event title..."
                      />
                    </div>
                    <div className="mb-5">
                      <label
                        htmlFor="subTitle"
                        className="mb-1 block text-sm font-medium text-neutral-300"
                      >
                        Add Subtitle
                      </label>
                      <textarea
                        id="subTitle"
                        value={subTitle}
                        onChange={(e) => setSubTitle(e.target.value)}
                        className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
                        placeholder="Enter Subtitle..."
                        style={{ resize: 'none' }}
                      />
                    </div>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <div className="mb-5">
                        <label
                          htmlFor="date"
                          className="mb-1 block text-sm font-medium text-neutral-300"
                        >
                          Add Event Date
                        </label>
                        <DatePicker
                          value={date}
                          onChange={(newValue) => setDate(newValue)}
                          sx={{
                            border: '1px solid #737373',
                            borderRadius: '4px',
                            width: '100%',
                            backgroundColor: '#262626',
                            '& .MuiPaper-root': {
                              '& .MuiPickersLayout-root': {
                                '& MuiDateCalendar-root': {
                                  backgroundColor: '#1f1f1f !important',
                                },
                              },
                            },
                            '& .MuiDateCalendar-root': {
                              backgroundColor: '#1f1f1f !important',
                            },
                            '& .MuiInputBase-input': {
                              color: 'white !important',
                            },
                            '& .MuiButtonBase-root': {
                              color: 'white !important',
                            },
                          }}
                          format="DD-MM-YYYY"
                        />
                      </div>
                      <div className="mb-5">
                        <label
                          htmlFor="time"
                          className="mb-1 block text-sm font-medium text-neutral-300"
                        >
                          Add Event Time
                        </label>
                        <TimePicker
                          value={time}
                          onChange={(newValue) => setTime(newValue)}
                          sx={{
                            border: '1px solid #737373',
                            borderRadius: '4px',
                            width: '100%',
                            backgroundColor: '#262626',
                            '& .MuiInputBase-input': {
                              color: 'white !important',
                            },
                            '& .MuiButtonBase-root': {
                              color: 'white !important',
                            },
                          }}
                          format="HH:mm"
                        />
                      </div>
                    </LocalizationProvider>
                    <div className="mb-5">
                      <label
                        htmlFor="link"
                        className="mb-1 block text-sm font-medium text-neutral-300"
                      >
                        Link for event
                      </label>
                      <input
                        type="url"
                        id="link"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
                        placeholder="Enter event link..."
                      />
                    </div>
                    <div className="mt-auto">
                      <button
                        type="submit"
                        className="mb-5 flex w-full items-center justify-center rounded-lg bg-neutral-800 px-5 py-2 text-white shadow-md hover:bg-neutral-700"
                        disabled={!title || !subTitle || !date || !link}
                      >
                        {loadingState.adding || loadingState.updateUploading ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <>
                            {selectedEvent ? 'Update Event' : 'Add Event'}
                            <span className="material-symbols-outlined ml-2">
                              {selectedEvent
                                ? 'edit_calendar'
                                : 'calendar_add_on'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : events.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <p className="text-neutral-400">No Events found.</p>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <div className="scrollbar flex h-[80%] flex-col gap-2 overflow-y-scroll no-scrollbar w-full">
                  {events.map((event: Event) => {
                    return (
                      <EventCard
                        event={event}
                        key={event.id}
                        setEvents={setEvents}
                        setSelectedEvent={setSelectedEvent}
                        setLoadingState={setLoadingState}
                        loadingState={loadingState}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {!loadingState.addNew && !loadingState.updating && (
              <button
                className="absolute bottom-0 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-800 px-5 py-2 text-white shadow-md hover:bg-neutral-700"
                onClick={() =>
                  setLoadingState({ ...loadingState, addNew: true })
                }
              >
                <span className="material-symbols-outlined">
                  calendar_add_on
                </span>
                Add New Event
              </button>
            )}
          </div>
        )}
      </MobileBox>
      <Toaster richColors duration={3000} closeButton position="bottom-right" />
    </>
  );
};

export default EventForm;
