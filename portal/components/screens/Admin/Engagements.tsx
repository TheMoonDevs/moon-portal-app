'use client';
import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { INITIAL_LOADING_STATE } from './ClientShortcutsManager';
import { loadingState } from './Events/EventForm';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Engagement, User } from '@prisma/client';
import { MobileBox } from '../Login/Login';
import { Spinner } from '@/components/elements/Loaders';
import ToolTip from '@/components/elements/ToolTip';
import { IconButton } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Autocomplete, Chip, TextField } from '@mui/material';
import { toast } from 'sonner';
import Image from 'next/image';
import dayjs, { Dayjs } from 'dayjs';
import { cn } from '@/app/lib/utils';

type EngagementFormState = {
  client_id: string;
  developer_ids: string[];
  title: string;
  startDate: string | null | Dayjs;
  endDate: string | null | Dayjs;
};

const Engagements = ({ users }: { users: User[] }) => {
  const [clients, setClients] = useState<User[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [formData, setFormData] = useState<EngagementFormState>({
    client_id: '',
    developer_ids: [],
    title: '',
    startDate: null,
    endDate: null,
  });
  const [loadingState, setLoadingState] = useState<loadingState>(
    INITIAL_LOADING_STATE,
  );
  const [engagementId, setEngagementId] = useState<string | null>(null);

  const fetchData = async (isOnlyEngagements?: boolean) => {
    setLoadingState((prev) => ({ ...prev, fetching: true }));
    try {
      if (isOnlyEngagements) {
        const res = await PortalSdk.getData('/api/engagement', null);
        setEngagements(res.data);
      } else {
        const [clientRes, engagementRes] = await Promise.all([
          PortalSdk.getData('/api/clients', null),
          PortalSdk.getData('/api/engagement', null),
        ]);
        setClients(clientRes.data.clients);
        setEngagements(engagementRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingState((prev) => ({ ...prev, fetching: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await PortalSdk.deleteData(`/api/engagement`, {
        id,
      });
      toast.success('Engagement deleted successfully');
      fetchData(true);
    } catch (error) {
      console.error(error);
      toast.error('Error deleting engagement');
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log(formData);
    setLoadingState({ ...loadingState, adding: true });
    try {
      const res = await PortalSdk.postData('/api/engagement', formData);
      toast.success('Engagement added successfully');
      fetchData(true);
    } catch (error) {
      console.error(error);
      toast.error('Error adding engagement');
    } finally {
      setLoadingState({ ...loadingState, adding: false });
      resetForm();
    }
  };

  const handleEditEngagement = (engagement: Engagement) => {
    setFormData({
      client_id: engagement.client_id,
      developer_ids: engagement.developer_ids,
      title: engagement.title,
      startDate: engagement.startDate
        ? dayjs(new Date(engagement.startDate))
        : null,
      endDate: engagement.endDate ? dayjs(new Date(engagement.endDate)) : null,
    });
    setEngagementId(engagement.id);
    setSearchTerm(
      clients.find((client) => client.id === engagement.client_id)?.name || '',
    );
    setLoadingState({ ...loadingState, updating: true });
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setLoadingState({ ...loadingState, updateUploading: true });

    try {
      const res = await PortalSdk.putData('/api/engagement', {
        ...formData,
        id: engagementId,
      });
      toast.success('Engagement updated successfully');
      fetchData(true);
    } catch (error) {
      console.error(error);
      toast.error('Error updating engagement');
    } finally {
      setLoadingState({ ...loadingState, updateUploading: false });
      resetForm();
    }
  };

  const handleClientSelect = (selectedUser: User) => {
    setFormData((prev) => ({
      ...prev,
      client_id: selectedUser.id,
    }));
    setSearchTerm(selectedUser.name || '');
    setSuggestions([]);
  };

  const handleUserChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(e.target.value);
    const filteredClients = clients.filter((client) =>
      client.name?.toLowerCase().includes(value),
    );
    setSuggestions(filteredClients);
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      developer_ids: [],
      title: '',
      startDate: null,
      endDate: null,
    });
    setSearchTerm('');
    setEngagementId(null);
    setSuggestions([]);
  };

  const renderForm = () => {
    return (
      <form
        onSubmit={loadingState.updating ? handleUpdate : handleFormSubmit}
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
              htmlFor="title"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Engagement Title
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
              placeholder="Enter engagement title..."
            />
          </div>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="mb-5">
              <label
                htmlFor="startDate"
                className="mb-1 block text-sm font-medium text-neutral-300"
              >
                Select start date
              </label>
              <DatePicker
                value={formData.startDate}
                onChange={(newValue) => {
                  setFormData({
                    ...formData,
                    startDate: newValue,
                  });
                }}
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
                htmlFor="endDate"
                className="mb-1 block text-sm font-medium text-neutral-300"
              >
                Select end date
              </label>
              <DatePicker
                value={formData.endDate}
                onChange={(newValue) => {
                  setFormData({
                    ...formData,
                    endDate: newValue,
                  });
                }}
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
                htmlFor="selectUsers"
                className="mb-1 block text-sm font-medium text-neutral-300"
              >
                Select Users
              </label>
              <Autocomplete
                multiple
                options={users}
                getOptionLabel={(option) => option.name || ''}
                value={users.filter((user) =>
                  formData.developer_ids.includes(user.id),
                )}
                onChange={(event, selectedUsers) => {
                  setFormData((prev) => ({
                    ...prev,
                    developer_ids: selectedUsers.map((user) => user.id),
                  }));
                }}
                renderTags={(tagValue, getTagProps) =>
                  tagValue.map((option, index) => (
                    <div key={option.id}>
                      <Chip
                        label={option.name}
                        {...getTagProps({ index })}
                        variant="outlined"
                        sx={{
                          borderColor: '#737373',
                          backgroundColor: '#262626',
                          color: '#fff',
                          '& .MuiChip-deleteIcon': { color: '#fff' },
                          '& .MuiChip-deleteIcon:hover': {
                            color: '#fff',
                          },
                        }}
                      />
                    </div>
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    sx={{
                      input: { color: '#fff' },
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#262626',
                        borderColor: '#737373',
                      },
                      '& .MuiInputLabel-root': { color: '#737373' },
                      '& .MuiSvgIcon-root': { color: '#fff' },
                      '& .MuiAutocomplete-clearIndicator': {
                        color: '#fff',
                      },
                    }}
                  />
                )}
              />
            </div>
          </LocalizationProvider>
          <div className="mt-auto">
            <button
              type="submit"
              className="mb-5 flex w-full items-center justify-center rounded-lg bg-neutral-800 px-5 py-2 text-white shadow-md hover:bg-neutral-700"
              disabled={
                !loadingState.adding &&
                !loadingState.updating &&
                !formData.title &&
                !formData.startDate &&
                !formData.endDate &&
                formData.client_id.length === 0 &&
                formData.developer_ids.length === 0
              }
            >
              {loadingState.adding || loadingState.updateUploading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <>
                  {loadingState.updating
                    ? 'Update Engagement'
                    : 'Add Engagement'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    );
  };

  return (
    <MobileBox
      customClass={
        cn(loadingState.addNew || loadingState.updating ? 'overflow-y-scroll' : '', '!w-[50%]')
      }
    >
      <p className="mb-6 text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
        Engagements
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
              {renderForm()}
            </>
          ) : engagements.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <p className="text-neutral-400">No Engament found.</p>
            </div>
          ) : (
            <div className="no-scrollbar flex h-[80%] flex-col gap-2 overflow-y-scroll">
              {engagements?.map((engagement: Engagement, index) => {
                const client = clients.find(
                  (client) => client.id === engagement.client_id,
                );
                return (
                  <div
                    key={engagement.id}
                    className="flex items-center rounded border border-neutral-700 p-2"
                  >
                    {client && (
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <Image
                            src={client.avatar || '/user-avatar.svg'}
                            alt="U"
                            className="mr-2 h-8 w-8 rounded-full"
                            width={32}
                            height={32}
                          />
                          <p className="text-white">{client.name}</p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            className="text-gray-400 hover:text-gray-600"
                            onClick={() => handleEditEngagement(engagement)}
                          >
                            <span className="material-symbols-outlined">
                              edit
                            </span>
                          </button>
                          <button
                            className="text-red-400 hover:text-red-600"
                            onClick={() => handleDelete(engagement.id)}
                            disabled={engagementId === engagement.id}
                          >
                            {engagementId === engagement.id ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <span className="material-symbols-outlined">
                                delete
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!loadingState.addNew && !loadingState.updating && (
            <button
              className="absolute bottom-0 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-800 px-5 py-2 text-white shadow-md hover:bg-neutral-700"
              onClick={() => setLoadingState({ ...loadingState, addNew: true })}
            >
              <span className="material-symbols-outlined">group_add</span>
              Add New Engagement
            </button>
          )}
        </div>
      )}
    </MobileBox>
  );
};

export default Engagements;
