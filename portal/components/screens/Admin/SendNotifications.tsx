'use client';
import React, { ChangeEvent, FormEvent, useState, useEffect } from 'react';
import { MobileBox } from '../Login/Login';
import { Spinner } from '@/components/elements/Loaders';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { User } from '@prisma/client';

const SendNotifications = ({
  users,
  loading,
}: {
  users: User[];
  loading: boolean;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);

  const handleUserChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(e.target.value);
    const filteredUsers = users.filter((user) =>
      user.name?.toLowerCase().includes(value)
    );
    setSuggestions(filteredUsers);
    setUser(null);
  };

  const handleUserSelect = (selectedUser: User) => {
    setUser(selectedUser);
    setSearchTerm(selectedUser.name || '');
    setSuggestions([]);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) return;
    const data = {
      userId: user?.id,
      title,
      description,
      notificationType: 'ADMIN',
      isRead: false
    };
    try {
      setSending(true);
      const response = await PortalSdk.postData('/api/notifications/add', data);
      setUser(null);
      setTitle('');
      setDescription('');
      setSearchTerm('');
      setSending(false);
      console.log('Notification created:', response);
    } catch (error) {
      console.error('Error creating notification:', error);
      setUser(null);
      setTitle('');
      setDescription('');
      setSending(false);
    }
  };

  return (
    <MobileBox>
      <p className='text-neutral-400 tracking-[0.5em] uppercase text-xs text-center mb-6'>
        Send Notifications
      </p>
      {loading ? (
        <div className='flex items-center justify-center h-full'>
          <Spinner />
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            className='w-full flex flex-col flex-grow my-2 relative'
          >
            <div className='flex-grow'>
              <div className='mb-6'>
                <label
                  htmlFor='user'
                  className='block text-sm font-medium text-neutral-300 mb-1'
                >
                  Select User
                </label>
                <input
                  type='text'
                  id='user'
                  value={searchTerm}
                  onChange={handleUserChange}
                  className='w-full p-2 bg-neutral-800 text-neutral-200 border border-neutral-500 rounded'
                  placeholder='Search users...'
                />
                {searchTerm && suggestions.length > 0 && (
                  <div className='suggestions-container w-full absolute'>
                    <ul className='bg-neutral-900 text-neutral-200 border border-neutral-500 rounded mt-1 absolute z-10 max-h-40 overflow-y-auto w-full'>
                      {suggestions.map((suggestion) => (
                        <li
                          key={suggestion.id}
                          className='p-2 cursor-pointer hover:bg-neutral-700'
                          onClick={() => handleUserSelect(suggestion)}
                        >
                          {suggestion.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className='mb-6'>
                <label
                  htmlFor='title'
                  className='block text-sm font-medium text-neutral-300 mb-1'
                >
                  Title
                </label>
                <input
                  type='text'
                  id='title'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className='w-full p-2 bg-neutral-800 text-neutral-200 border border-neutral-500 rounded'
                  placeholder='Enter title...'
                />
              </div>
              <div className='mb-6'>
                <label
                  htmlFor='description'
                  className='block text-sm font-medium text-neutral-300 mb-1'
                >
                  Description
                </label>
                <textarea
                  id='description'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className='w-full p-2 bg-neutral-800 text-neutral-200 border border-neutral-500 rounded'
                  placeholder='Enter description...'
                />
              </div>
            </div>
            <div className='mt-auto'>
              <button
                type='submit'
                className='py-2 px-5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center justify-center shadow-md w-full'
                disabled={!user || !title || !description}
              >
                {sending ? (
                  <Spinner />
                ) : (
                  <>
                    Send Notification
                    <span className='material-symbols-outlined ml-2'>send</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </MobileBox>
  );
};

export default SendNotifications;
