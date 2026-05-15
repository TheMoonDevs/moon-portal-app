'use client';
import type { User } from '@db/client';
import type { ChangeEvent, FormEvent } from 'react';
import React, { useState } from 'react';

import { Spinner } from '@/components/elements/Loaders';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { MobileBox } from '../Login/Login';

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
      user.name?.toLowerCase().includes(value),
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
      isRead: false,
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
    <MobileBox customClass="!w-[50%]">
      <p className="mb-6 text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
        Send Notifications
      </p>
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            className="relative my-2 flex w-[90%] grow flex-col"
          >
            <div className="grow">
              <div className="mb-6">
                <label
                  htmlFor="user"
                  className="mb-1 block text-sm font-medium text-neutral-300"
                >
                  Select User
                </label>
                <input
                  type="text"
                  id="user"
                  value={searchTerm}
                  onChange={handleUserChange}
                  className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
                  placeholder="Search users..."
                />
                {searchTerm && suggestions.length > 0 && (
                  <div className="suggestions-container absolute w-full">
                    <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded border border-neutral-500 bg-neutral-900 text-neutral-200">
                      {suggestions.map((suggestion) => (
                        <li
                          key={suggestion.id}
                          className="cursor-pointer p-2 hover:bg-neutral-700"
                          onClick={() => handleUserSelect(suggestion)}
                        >
                          {suggestion.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mb-6">
                <label
                  htmlFor="title"
                  className="mb-1 block text-sm font-medium text-neutral-300"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
                  placeholder="Enter title..."
                />
              </div>
              <div className="mb-6">
                <label
                  htmlFor="description"
                  className="mb-1 block text-sm font-medium text-neutral-300"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
                  placeholder="Enter description..."
                  style={{ resize: 'none' }}
                />
              </div>
            </div>
            <div className="mt-auto">
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-lg bg-neutral-800 px-5 py-2 text-white shadow-md hover:bg-neutral-700"
                disabled={!user || !title || !description}
              >
                {sending ? (
                  <Spinner />
                ) : (
                  <>
                    Send Notification
                    <span className="material-symbols-outlined ml-2">send</span>
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
