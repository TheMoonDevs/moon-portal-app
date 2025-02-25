import { useState } from 'react';
import { loadingState } from './EventForm';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { toast } from 'sonner';
import { Event } from '@prisma/client';
import { Spinner } from '@/components/elements/Loaders';
import { IconButton } from '@mui/material';
import dayjs from 'dayjs';

export const EventCard = ({
  event,
  setEvents,
  setSelectedEvent,
  setLoadingState,
  loadingState,
}: {
  event: Event;
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setSelectedEvent: React.Dispatch<React.SetStateAction<Event | null>>;
  setLoadingState: React.Dispatch<React.SetStateAction<loadingState>>;
  loadingState: loadingState;
}) => {
  const [deleting, setDeleting] = useState(false);
  const time = dayjs(event.time, 'HH:mm').format('h:mm A');

  const deleteEvent = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await PortalSdk.deleteData('/api/events', event);
      toast.success('Event deleted successfully!');
      setEvents((prevEvents) => prevEvents.filter((e) => e.id !== event.id));
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="flex cursor-pointer items-center justify-between border-b border-neutral-800 py-2 text-white"
      onClick={(e) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setLoadingState({ ...loadingState, updating: true });
      }}
    >
      <div className="flex flex-col items-start gap-1">
        <p className="text-sm text-neutral-300">{event.name}</p>
        <p className="text-xs text-neutral-500">
          {dayjs(event.date).format('MMMM D, YYYY')} - {time}
        </p>
      </div>
      {deleting ? (
        <Spinner className="mr-2 h-5 w-5" />
      ) : (
        <IconButton sx={{ backgroundColor: '#1b1b1b' }} onClick={deleteEvent}>
          <span className="material-symbols-outlined text-red-600">delete</span>
        </IconButton>
      )}
    </div>
  );
};
