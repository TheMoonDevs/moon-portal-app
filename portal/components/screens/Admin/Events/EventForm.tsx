'use client';
import React, { useState } from 'react';
import { MobileBox } from '../../Login/Login';
import { Spinner } from '@/components/elements/Loaders';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { toast, Toaster } from 'sonner';
import { PortalSdk } from '@/utils/services/PortalSdk';

const EventForm = () => {
  const [title, setTitle] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [link, setLink] = useState('');
  const [date, setDate] = useState<Dayjs | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !title || !subTitle || !link) return;
    const formattedDate = date.format('DD-MM-YYYY');
    const year = date.year();
    const month = Number(date.format('M'));
    const eventData = {
      title,
      subTitle,
      link,
      date: formattedDate,
      month,
      year,
    };
    setAdding(true);

    try {
      await PortalSdk.postData('api/events', eventData);
      toast.success('Event added successfully!');
      setTitle('');
      setSubTitle('');
      setLink('');
      setDate(null);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to add event. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <MobileBox>
        <p className='text-neutral-400 tracking-[0.5em] uppercase text-xs text-center mb-6'>
          Add Event
        </p>
        <form
          onSubmit={handleSubmit}
          className='w-full flex flex-col flex-grow my-2 relative h-full overflow-y-scroll no-scrollbar'
        >
          <div className='flex-grow'>
            <div className='mb-5'>
              <label
                htmlFor='eventTitle'
                className='block text-sm font-medium text-neutral-300 mb-1'
              >
                Event Title
              </label>
              <input
                type='text'
                id='eventTitle'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='w-full p-2 bg-neutral-800 text-neutral-200 border border-neutral-500 rounded'
                placeholder='Enter event title...'
              />
            </div>
            <div className='mb-5'>
              <label
                htmlFor='subTitle'
                className='block text-sm font-medium text-neutral-300 mb-1'
              >
                Add Subtitle
              </label>
              <textarea
                id='subTitle'
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                className='w-full p-2 bg-neutral-800 text-neutral-200 border border-neutral-500 rounded'
                placeholder='Enter Subtitle...'
                style={{ resize: 'none' }}
              />
            </div>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className='mb-5'>
                <label
                  htmlFor='date'
                  className='block text-sm font-medium text-neutral-300 mb-1'
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
                          backgroundColor: '#1f1f1f !important', //The popover datepicker should be dark - need to fixed this
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
                  format='DD-MM-YYYY'
                />
              </div>
            </LocalizationProvider>
            <div className='mb-5'>
              <label
                htmlFor='link'
                className='block text-sm font-medium text-neutral-300 mb-1'
              >
                Link for event
              </label>
              <input
                type='url'
                id='link'
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className='w-full p-2 bg-neutral-800 text-neutral-200 border border-neutral-500 rounded'
                placeholder='Enter event link...'
              />
            </div>
            <div className='mt-auto'>
              <button
                type='submit'
                className='py-2 px-5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center shadow-md w-full'
                disabled={!title || !subTitle || !date || !link}
              >
                {adding ? (
                  <Spinner />
                ) : (
                  <>
                    Add Event
                    <span className='material-symbols-outlined ml-2'>
                      calendar_add_on
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </MobileBox>
      <Toaster richColors duration={3000} closeButton position='bottom-right' />
    </>
  );
};

export default EventForm;
