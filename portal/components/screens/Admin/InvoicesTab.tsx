import { Spinner } from '@/components/elements/Loaders';
import { MobileBox } from '../Login/Login';
import { Invoice, PayType, User, USERTYPE } from '@prisma/client';
import { FormEvent, useEffect, useState } from 'react';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { INITIAL_LOADING_STATE } from './ClientShortcutsManager';
import { loadingState } from './Events/EventForm';
import ToolTip from '@/components/elements/ToolTip';
import { Autocomplete, Chip, IconButton, TextField } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';
type InvoiceFormState = {
  clientId: string;
  startDate: string | null | Dayjs;
  endDate: string | null | Dayjs;
  dueDate: string | null | Dayjs;
  title: string;
  description: string;
  devIds: string[]; // Store user IDs as an array instead of a relation
  amountTotal: number;
  amountToPay: number;
  amountDiscount: number;
  payType: PayType;
  invoicePdf: string; // Store file URL or path
  workInfo: any;
};
const InvoicesTab = ({
  loading,
  users,
}: {
  loading: boolean;
  users: User[];
}) => {
  const filteredUsers = users.filter(
    (user) => user.userType === USERTYPE['CLIENT'],
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    filteredUsers[0]?.id,
  );
  const [loadingState, setLoadingState] = useState<loadingState>(
    INITIAL_LOADING_STATE,
  );

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [formData, setFormData] = useState<InvoiceFormState>({
    clientId: selectedClientId || '',
    startDate: null,
    endDate: null,
    dueDate: null,
    title: '',
    description: '',
    devIds: [], // Store user IDs as an array instead of a relation
    amountTotal: 0,
    amountToPay: 0,
    amountDiscount: 0,
    payType: PayType.BANK,
    invoicePdf: '', // Store file URL or path
    workInfo: {},
  });

  useEffect(() => {
    const fetchInvoicesByClientId = async () => {
      try {
        setLoadingState({ ...loadingState, fetching: true });
        const res = await PortalSdk.getData(
          `/api/client-invoice?clientId=${selectedClientId}`,
          null,
        );
        setInvoices(res.data);
        setLoadingState({ ...loadingState, fetching: false });
      } catch (error) {
        console.error(error);
      }
    };

    if (selectedClientId) {
      fetchInvoicesByClientId();
    }
  }, [selectedClientId]);
  const handleUpdate = async (e: FormEvent) => {};
  const handleFormSubmit = async (e: FormEvent) => {};
  const handleDelete = async (id: string) => {};
  const handleEditInvoice = (invoice: Invoice) => {};

  const renderForm = () => {
    return (
      <form
        onSubmit={loadingState.updating ? handleUpdate : handleFormSubmit}
        className="relative my-2 flex h-full w-[90%] flex-grow flex-col"
      >
        <div className="flex-grow">
          <div className="mb-5">
            <label
              htmlFor="user"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Select Client
            </label>
            <select
              id="user"
              value={formData.clientId || ''}
              onChange={(e) =>
                setFormData({ ...formData, clientId: e.target.value })
              }
              className="w-full rounded border border-neutral-500 bg-neutral-800 p-3 text-neutral-200"
            >
              <option value="" disabled>
                Select a client...
              </option>
              {filteredUsers.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-5">
            <label
              htmlFor="title"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Invoice Title
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
                options={users.filter((user) => user.userType === 'MEMBER')}
                getOptionLabel={(option) => option.name || ''}
                value={users.filter((user) =>
                  formData.devIds.includes(user.id),
                )}
                onChange={(event, selectedUsers) => {
                  setFormData((prev) => ({
                    ...prev,
                    devIds: selectedUsers.map((user) => user.id),
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
          {/* <div className="mb-5">
            <label
              htmlFor="isActive"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Is Engagement Active
            </label>
            <select
              id="isActive"
              name="isActive"
              value={formData.isActive.toString()}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isActive: e.target.value === 'true',
                })
              }
              className="block w-full rounded-md border border-neutral-300 bg-neutral-800 p-2 text-neutral-300 focus:border-neutral-500 focus:outline-none focus:ring focus:ring-neutral-500"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div> */}
          {/* <div className="mb-5">
            <label
              htmlFor="engagementType"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Engagement Type
            </label>
            <select
              id="engagementType"
              name="engagementType"
              value={formData.engagementType || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  engagementType: e.target.value as ENGAGEMENTTYPE,
                })
              }
              className="block w-full rounded-md border border-neutral-300 bg-neutral-800 p-2 text-neutral-300 focus:border-neutral-500 focus:outline-none focus:ring focus:ring-neutral-500"
            >
              <option value={''}>Select Engagement Type</option>
              <option value={ENGAGEMENTTYPE.HOURLY}>Hourly</option>
              <option value={ENGAGEMENTTYPE.PART_TIME}>Part Time</option>
              <option value={ENGAGEMENTTYPE.FULL_TIME}>Full Time</option>
              <option value={ENGAGEMENTTYPE.FIXED}>Fixed</option>
            </select>
          </div> */}
          {/* {formData.engagementType &&
            (formData.engagementType === 'FIXED' ? (
              <div className="mb-5">
                <label
                  htmlFor="fixed"
                  className="mb-1 block text-sm font-medium text-neutral-300"
                >
                  Enter Progress Percentage
                </label>
                <input
                  type="text"
                  value={formData.progressPercentage || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      progressPercentage: Number(e.target.value),
                    })
                  }
                  className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
                />
              </div>
            ) : (
              <div className="mb-5">
                <label className="mb-1 block text-sm font-medium text-neutral-300">
                  Enter Number of Hours
                </label>
                <input
                  type="text"
                  readOnly={formData.engagementType !== 'HOURLY'}
                  value={formData.numberOfHours || ''}
                  onChange={handleNoOfHoursChange}
                  className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
                />
              </div>
            ))} */}
          <div className="mt-auto">
            <button
              type="submit"
              className="mb-5 flex w-full items-center justify-center rounded-lg bg-neutral-800 px-5 py-2 text-white shadow-md hover:bg-neutral-700"
              //   disabled={
              //     !formData.title.trim() ||
              //     formData.client_id.length === 0 ||
              //     !formData.startDate ||
              //     !formData.endDate ||
              //     formData.developer_ids.length === 0 ||
              //     !formData.engagementType ||
              //     (['PART_TIME', 'FULL_TIME', 'HOURLY'].includes(
              //       formData.engagementType,
              //     ) &&
              //       formData.numberOfHours == null) ||
              //     (formData.engagementType === 'FIXED' &&
              //       formData.progressPercentage == null)
              //   }
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

  if (loading)
    return (
      <div className="flex items-center justify-center gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.5em] text-neutral-400">
          Loading Please Wait...
        </p>
        <Spinner />
      </div>
    );
  return (
    <div className="relative flex !h-screen w-full items-center justify-center gap-6">
      <MobileBox customClass="!w-full mt-6 custom-scrollbar ">
        <p className="mb-4 text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
          filteredUsers
        </p>
        <div className="my-2 flex max-h-full w-[90%] grow flex-col justify-start gap-4">
          {filteredUsers.map((user) => (
            <div
              onClick={() => {
                setSelectedClientId(user.id);
                setFormData((prev) => ({
                  ...prev,
                  clientId: user.id,
                }));
              }}
              key={user.id}
              className="flex flex-row items-center justify-between rounded-lg border border-neutral-700 px-4 py-2 hover:bg-neutral-800"
            >
              <div className="flex cursor-pointer flex-row items-center justify-center gap-4 rounded-lg px-4 py-2 hover:bg-neutral-800">
                <div className="rounded-full p-1">
                  <img
                    src={user?.avatar || undefined}
                    alt={user?.name || ''}
                    className="h-12 w-12 rounded-full object-cover object-center"
                  />
                </div>
                <div>
                  <p className="text-neutral-300">{user.name}</p>
                  <p className="text-sm text-neutral-600">
                    {/* {user.userType}| */}
                    {user.username}-{user.password}
                  </p>
                </div>
              </div>
              <span className="material-icons text-neutral-400">
                chevron_right
              </span>
            </div>
          ))}
        </div>
      </MobileBox>
      <MobileBox customClass="!w-full mt-6 custom-scrollbar ">
        <p className="mb-4 text-center text-xs uppercase tracking-[0.5em] text-neutral-400">
          INVOICES
        </p>
        {loadingState.fetching ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div
            className={`relative h-full w-full ${loadingState.addNew || loadingState.updating ? '' : 'flex justify-center'}`}
          >
            {loadingState.addNew || loadingState.updating ? (
              <div className="flex flex-col items-center justify-center">
                <div className="ml-4 self-start">
                  <ToolTip title="Back to Previous Slide">
                    <IconButton
                      onClick={() => {
                        loadingState.updating
                          ? setLoadingState({
                              ...loadingState,
                              updating: false,
                            })
                          : setLoadingState({ ...loadingState, addNew: false });
                        // resetForm();
                      }}
                      sx={{ backgroundColor: '#1b1b1b', mb: 2 }}
                    >
                      <span className="material-symbols-outlined !text-white">
                        arrow_back
                      </span>
                    </IconButton>
                  </ToolTip>
                </div>
                <div className="flex !w-[90%] items-center justify-center">
                  {renderForm()}
                </div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <p className="text-neutral-400">No Invoice found.</p>
              </div>
            ) : (
              <div className="no-scrollbar flex h-[80%] w-[90%] flex-col gap-2 overflow-y-scroll">
                {invoices.map((invoice: Invoice, index: number) => {
                  return (
                    <div
                      key={invoice.id}
                      className="flex items-center rounded border border-neutral-700 px-2 py-3"
                    ></div>
                  );
                })}
              </div>
            )}
            {!loadingState.addNew && !loadingState.updating && (
              <button
                className="absolute bottom-0 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-800 px-5 py-2 text-white shadow-md hover:bg-neutral-700"
                onClick={() =>
                  setLoadingState({ ...loadingState, addNew: true })
                }
              >
                <span className="material-symbols-outlined">group_add</span>
                Add New Invoice
              </button>
            )}
          </div>
        )}
      </MobileBox>
    </div>
  );
};

export default InvoicesTab;
