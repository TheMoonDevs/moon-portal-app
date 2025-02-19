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
import dayjs, { Dayjs } from 'dayjs';
import { useUser } from '@/utils/hooks/useUser';
import { FileWithPath } from '@mantine/dropzone';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import Link from 'next/link';
import { toast } from 'sonner';
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
  isInvoicePaid: boolean;
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
    isInvoicePaid: false,
    payType: PayType.BANK,
    invoicePdf: '', // Store file URL or path
    workInfo: {},
  });

  const [files, setFiles] = useState<File | FileList | FileWithPath>();
  const [isFileUploading, setIsFileUploading] = useState<boolean>(false);
  const { user } = useUser();

  const handleFileDrop = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (files) setFiles(undefined);
    const droppedFiles = event.target.files?.item(0);
    console.log(droppedFiles);
    if (droppedFiles) setFiles(droppedFiles);
  };

  const handleUpload = async () => {
    setIsFileUploading(true);
    if (files) {
      const formData = new FormData();
      formData.append('file', files as File, (files as FileWithPath).path);
      if (user) {
        const userId = user.id;
        formData.append('userId', userId);
      }
      formData.append('folderName', 'invoices');
      try {
        const response = await fetch('/api/upload/file-upload', {
          method: 'POST',
          body: formData,
          headers: {
            tmd_portal_api_key: TMD_PORTAL_API_KEY,
          },
        });

        if (response.ok) {
          const responseData = await response.json();
          const fileUrl = responseData.fileInfo[0].fileUrl;

          setFormData((prevFormData) => ({
            ...prevFormData,
            invoicePdf: fileUrl, // Store file URL or path
          }));
          console.log('File uploaded successfully!');
          setIsFileUploading(false);
        } else {
          // Handle error
          setIsFileUploading(false);
          console.error('Failed to upload file:', response.statusText);
        }
      } catch (error) {
        setIsFileUploading(false);
        console.error('Error uploading file:', error);
        // Handle error
      }
    }
  };

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

  const filePreview = () => {
    const pdf = files as File;
    const fileUrl = URL.createObjectURL(pdf);
    return (
      <Link
        href={fileUrl}
        target="_blank"
        className="mt-2 flex items-center gap-2 text-sm text-blue-500"
      >
        <span className="icon_size material-icons">picture_as_pdf</span>
        <p className="underline">{pdf.name}</p>
        <span className="icon_size material-symbols-outlined">
          {' '}
          open_in_new
        </span>
      </Link>
    );
  };

  const resetForm = () => {
    setFormData({
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
      isInvoicePaid: false,
      payType: PayType.BANK,
      invoicePdf: '', // Store file URL or path
      workInfo: {},
    });
  };

  const handleUpdate = async (e: FormEvent) => {};
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoadingState({ ...loadingState, adding: true });

      // upload the pdf file to the server
      await handleUpload();
      console.log(formData.invoicePdf);

      const res = await PortalSdk.postData('/api/client-invoice', formData);
      toast.success('Invoice added successfully');
      setLoadingState({ ...loadingState, adding: false });
    } catch (error) {
      console.error(error);
      setLoadingState({ ...loadingState, adding: false });
    }
  };
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
              placeholder="Enter invoice title..."
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Invoice Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
              placeholder="Enter invoice description..."
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
                htmlFor="dueDate"
                className="mb-1 block text-sm font-medium text-neutral-300"
              >
                Select due date
              </label>
              <DatePicker
                value={formData.dueDate}
                onChange={(newValue) => {
                  setFormData({
                    ...formData,
                    dueDate: newValue,
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
          <div className="mb-5">
            <label
              htmlFor="isPaid"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Is Invoice Paid?
            </label>
            <select
              id="isActive"
              name="isActive"
              value={formData.isInvoicePaid.toString()}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isInvoicePaid: e.target.value === 'true',
                })
              }
              className="block w-full rounded-md border border-neutral-300 bg-neutral-800 p-2 text-neutral-300 focus:border-neutral-500 focus:outline-none focus:ring focus:ring-neutral-500"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className="mb-5">
            <label
              htmlFor="payType"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Payment Type
            </label>
            <select
              id="payType"
              name="payType"
              value={formData.payType || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  payType: e.target.value as PayType,
                })
              }
              className="block w-full rounded-md border border-neutral-300 bg-neutral-800 p-2 text-neutral-300 focus:border-neutral-500 focus:outline-none focus:ring focus:ring-neutral-500"
            >
              <option value={''}>Select Payment Type</option>
              <option value={PayType.BANK}>BANK</option>
              <option value={PayType.CRYPTO}>CRYPTO</option>
            </select>
          </div>

          <div className="mb-5">
            <label
              htmlFor="amountTotal"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Total Amount (in USD)
            </label>
            <input
              type="text"
              id="amountTotal"
              value={formData.amountTotal || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amountTotal: Number(e.target.value),
                })
              }
              className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
              placeholder="Enter total amount..."
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="amountDiscount"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Discount Amount (in USD)
            </label>
            <input
              type="text"
              id="amountDiscount"
              value={formData.amountDiscount || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amountDiscount: Number(e.target.value),
                })
              }
              className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
              placeholder="Enter discount amount..."
            />
          </div>

          <div className="mb-5">
            <label
              htmlFor="amountToPay"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Amount to Pay (in USD)
            </label>
            <input
              type="text"
              id="amountToPay"
              value={
                Number(formData.amountTotal) && Number(formData.amountDiscount)
                  ? Number(formData.amountTotal - formData.amountDiscount) || 0
                  : Number(formData.amountToPay) || 0
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amountToPay: Number(e.target.value),
                })
              }
              className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
              placeholder="Enter amount to pay..."
            />
          </div>

          <div className="mb-5">
            <label
              htmlFor="fileUpload"
              className="mb-1 block text-sm font-medium text-neutral-300"
            >
              Upload Invoice PDF
            </label>
            <input
              type="file"
              multiple={false}
              id="fileUpload"
              onChange={handleFileDrop}
              className="w-full rounded border border-neutral-500 bg-neutral-800 p-2 text-neutral-200"
            />
            {files && filePreview()}
          </div>

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
          CLIENTS
        </p>
        <div className="my-2 flex max-h-full w-[90%] grow flex-col justify-start gap-4">
          {filteredUsers.map((user) => (
            <div
              onClick={() => {
                setSelectedClientId(user.id);
                resetForm();
                setLoadingState(INITIAL_LOADING_STATE);
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
                    >
                      <div className="flex w-full flex-row items-center justify-between">
                        <div className="flex flex-row items-center gap-4">
                          <div className="flex flex-col">
                            <p className="text-sm font-bold text-neutral-300">
                              {invoice.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <p className="text-sm font-bold text-neutral-300">
                            {dayjs(invoice.createdAt).format('DD MMM YYYY')}
                          </p>
                          <p className="text-sm font-bold text-neutral-300">
                            {dayjs(invoice.updatedAt).format('DD MMM YYYY')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!loadingState.addNew && !loadingState.updating && (
              <button
                className="absolute bottom-0 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-800 px-5 py-2 text-white shadow-md hover:bg-neutral-700"
                onClick={handleFormSubmit}
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
