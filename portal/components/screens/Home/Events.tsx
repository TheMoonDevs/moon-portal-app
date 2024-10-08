'use client';
import { PortalSdk } from '@/utils/services/PortalSdk';
import React, { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Event } from '@prisma/client';
import { Skeleton } from '@mui/material';
import Link from 'next/link';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

const getDaySuffix = (day: number) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

const Events = () => {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const month = dayjs().format('M');
  const year = dayjs().year();
  const eventsContainerRef = useRef<HTMLDivElement>(null);

  const getEvents = async () => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/events?year=${year}&month=${month}`,
        null
      );
      setEvents(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getEvents();
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      setSelectedEvent(events[0]);
    }
  }, [events]);

  const isEventToday =
    selectedEvent &&
    dayjs(selectedEvent.date, 'DD-MM-YYYY').isSame(dayjs(), 'day');
  const isEventPast =
    selectedEvent &&
    dayjs(selectedEvent.date, 'DD-MM-YYYY').isBefore(dayjs(), 'day');

  return (
    <div>
      {loading ? (
        <div className='px-4'>
          <Skeleton
            animation='wave'
            sx={{
              width: '100%',
              height: '150px',
              borderRadius: '20px',
            }}
          />
        </div>
      ) : (
        events.length > 0 && (
          <div className='h-[120px] bg-black rounded-3xl m-4'>
            {/* Header */}
            <div className='h-5 px-6 py-3 bg-[#FFBE18] text-black text-[10px] w-fit rounded-bl-2xl rounded-br-2xl flex items-center justify-center mx-7'>
              Upcoming events
            </div>
            <div
              className={`flex justify-between items-start ${
                (isEventToday || isEventPast) && 'items-center'
              }`}
            >
              <div className='flex gap-4 items-start'>
                <div
                  ref={eventsContainerRef}
                  className='flex flex-col overflow-y-scroll no-scrollbar h-[80px] relative top-3'
                >
                  {selectedEvent && (
                    <div className='flex gap-3 items-center pb-2'>
                      {/* Line */}
                      <div className=''>
                        <div className='h-[1px] w-5 bg-white' />
                      </div>
                      <div className='text-lg font-bold text-white max-w-1/2'>
                        {selectedEvent.name} -{' '}
                        {dayjs(selectedEvent.date, 'DD-MM-YYYY').format(
                          'MMMM D'
                        )}
                        {getDaySuffix(
                          dayjs(selectedEvent.date, 'DD-MM-YYYY').date()
                        )}
                      </div>
                    </div>
                  )}
                  {/* Events */}
                  <div className='pl-8'>
                    {events
                      ?.filter((event) => event.id !== selectedEvent?.id)
                      ?.map((event: Event, index: number) => {
                        const formattedDate = dayjs(
                          event.date,
                          'DD-MM-YYYY'
                        ).format('MMMM D');
                        const day = dayjs(event.date, 'DD-MM-YYYY').date();
                        return (
                          <div
                            key={event.id}
                            className={`max-w-1/2 text-[10px] text-neutral-500 pb-1 cursor-pointer `}
                          >
                            <p
                              className={`whitespace-wrap`}
                              onClick={() => {
                                setSelectedEvent(event);
                                eventsContainerRef.current?.scrollTo({
                                  top: 0,
                                  behavior: 'smooth',
                                });
                              }}
                            >
                              {event?.name} - {formattedDate}
                              {getDaySuffix(day)}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
              {/* Days to go section */}
              <div className='text-[10px] text-neutral-500 px-4'>
                {isEventPast ? (
                  <span className='text-red-500 font-normal w-1/2'>
                    Event is expired
                  </span>
                ) : isEventToday ? (
                  <Link
                    href={selectedEvent.link}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex flex-col gap-2 items-center justify-center text-white'
                  >
                    <span className='material-symbols-outlined'>
                      open_in_new
                    </span>
                    Open Event
                  </Link>
                ) : (
                  <span className='text-[32px] font-normal text-white'>
                    {selectedEvent
                      ? String(
                          dayjs(selectedEvent.date, 'DD-MM-YYYY').diff(
                            dayjs(),
                            'day'
                          )
                        ).padStart(2, '0')
                      : '00'}
                  </span>
                )}
                <br />
                {isEventPast || isEventToday ? null : <span>Days to go</span>}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Events;
