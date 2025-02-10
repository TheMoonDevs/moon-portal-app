'use client';
import React, { ChangeEvent, useState, useEffect } from 'react';
import { MobileBox } from '../Login/Login';
import { toast, Toaster } from 'sonner';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { ClientUtilityLink, User } from '@prisma/client';
import { Spinner } from '@/components/elements/Loaders';
import { loadingState } from './Events/EventForm';
import ToolTip from '@/components/elements/ToolTip';
import { IconButton } from '@mui/material';
import ClientShortcuts, { GroupedClientUtilityLink } from './ClientShortcuts';

const ClientShortcutsManager = () => {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [clients, setClients] = useState<User[]>([]);
  const [loadingState, setLoadingState] = useState<loadingState>({
    addNew: false,
    fetching: false,
    adding: false,
    updating: false,
    updateUploading: false,
  });
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [clientShortcuts, setClientShortcuts] = useState<
    GroupedClientUtilityLink[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);

  const fetchClientShortcuts = async () => {
    setLoadingState({ ...loadingState, fetching: true });
    try {
      const res = await PortalSdk.getData('/api/client-shortcuts', null);
      setClientShortcuts(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingState({ ...loadingState, fetching: false });
    }
  };

  const fetchClients = async () => {
    setLoadingState({ ...loadingState, fetching: true });
    try {
      const res = await PortalSdk.getData('/api/clients', null);
      setClients(res.data.clients);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingState({ ...loadingState, fetching: false });
    }
  };

  useEffect(() => {
    fetchClients();
    fetchClientShortcuts();
  }, []);

  const handleUserChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(e.target.value);
    const filteredClients = clients.filter((client) =>
      client.name?.toLowerCase().includes(value),
    );
    setSuggestions(filteredClients);
    setSelectedClient(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingState({ ...loadingState, adding: true });
    try {
      const res = await PortalSdk.postData('/api/client-shortcuts', {
        title,
        link,
        clientId: selectedClient?.id,
      });
      toast.success('Shortcut added successfully');
      fetchClientShortcuts();
    } catch (error) {
      console.log(error);
      toast.error('Error adding shortcut');
    } finally {
      setLoadingState({ ...loadingState, adding: false });
      resetForm();
    }
  };

  const resetForm = () => {
    setSearchTerm('');
    setSelectedClient(null);
    setTitle('');
    setLink('');
  };

  const handleClientSelect = (selectedUser: User) => {
    setSelectedClient(selectedUser);
    setSearchTerm(selectedUser.name || '');
    setSuggestions([]);
  };

  return (
    <>
      <MobileBox>
        <p className="mb-6 text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
          Add Shortcuts for Client
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
                        htmlFor="user"
                        className="mb-1 block text-sm font-medium text-neutral-300"
                      >
                        Select Client
                      </label>
                      <input
                        type="text"
                        id="user"
                        value={searchTerm || ''}
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
                                onClick={() => handleClientSelect(suggestion)}
                              >
                                {suggestion.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="mb-5">
                      <label
                        htmlFor="linkTitle"
                        className="mb-1 block text-sm font-medium text-neutral-300"
                      >
                        Shortcut Title
                      </label>
                      <input
                        type="text"
                        id="linkTitle"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
                        placeholder="Enter shortcut title..."
                      />
                    </div>
                    <div className="mb-5">
                      <label
                        htmlFor="link"
                        className="mb-1 block text-sm font-medium text-neutral-300"
                      >
                        Link for shortcut
                      </label>
                      <input
                        type="url"
                        id="link"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
                        placeholder="Enter shortcut link..."
                      />
                    </div>
                    <div className="mt-auto">
                      <button
                        type="submit"
                        className="mb-5 flex w-full items-center justify-center rounded-lg bg-neutral-800 px-5 py-2 text-white shadow-md hover:bg-neutral-700"
                        disabled={!title || !link || !selectedClient}
                      >
                        {loadingState.adding || loadingState.updateUploading ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <>Add Shortcut</>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : clientShortcuts?.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <p className="text-neutral-400">No Shortcuts found.</p>
              </div>
            ) : (
              <div className="no-scrollbar flex h-[80%] flex-col gap-2 overflow-y-scroll">
                {clientShortcuts?.map(
                  (shortcut: GroupedClientUtilityLink, index) => {
                    return (
                      <ClientShortcuts
                        shortcut={shortcut}
                        key={`${shortcut.clientName}-${index}-${shortcut.avatar}`}
                      />
                    );
                  },
                )}
              </div>
            )}
            {!loadingState.addNew && !loadingState.updating && (
              <button
                className="absolute bottom-0 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-800 px-5 py-2 text-white shadow-md hover:bg-neutral-700"
                onClick={() =>
                  setLoadingState({ ...loadingState, addNew: true })
                }
              >
                <span className="material-symbols-outlined">add_link</span>
                Add New Shortcut
              </button>
            )}
          </div>
        )}
      </MobileBox>
      <Toaster richColors duration={3000} closeButton position="bottom-right" />
    </>
  );
};

export default ClientShortcutsManager;
