import {
  AccountBalance as BankIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';
import BadgeIcon from '@mui/icons-material/Badge';
import BusinessIcon from '@mui/icons-material/Business';
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin';
import NumbersIcon from '@mui/icons-material/Numbers';
import PersonIcon from '@mui/icons-material/Person';
import {
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import React from 'react';

import { Button } from '@/components/elements/Button';
import { Spinner } from '@/components/elements/Loaders';

import type { InvoiceData } from './InvoicePage';

interface InvoiceModalProps {
  invoiceData: InvoiceData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDateChange: (
    fieldName: 'invoiceDate' | 'dueDate',
    newValue: Date | null,
  ) => void;
  handlePaymentMethodChange: (
    event: React.ChangeEvent<{ value: unknown }>,
  ) => void;
  handleOwnerInfoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpdatePaymentInfo: () => Promise<void>;
  loading: boolean;
  showUpdateButton: boolean;
  dataLoad: boolean;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoiceData,
  handleInputChange,
  handleDateChange,
  handlePaymentMethodChange,
  handleOwnerInfoChange,
  handleUpdatePaymentInfo,
  loading,
  showUpdateButton,
  dataLoad,
}) => {
  return (
    <div className="mx-auto mb-8 w-full max-w-lg overflow-y-scroll rounded-lg border-2 p-6 shadow-lg max-md:mb-0 md:mt-4">
      <h2 className="mb-6 text-center font-serif text-2xl font-medium">
        Invoice Details
      </h2>
      {dataLoad ? (
        <div className="flex h-[50vh] w-full items-center justify-center">
          <Spinner className="text-green-600" />
        </div>
      ) : (
        <>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <div className="mb-4 flex w-full flex-col">
              <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
                *Invoice Id
              </span>
              <TextField
                required
                type="text"
                id="invoice-id"
                size="small"
                name="invoiceId"
                color="info"
                placeholder="Add Invoice Id"
                variant="outlined"
                className="w-full"
                value={invoiceData.invoiceId}
                onChange={handleInputChange}
              />
            </div>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <div className="mb-4 flex w-full flex-col">
                  <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
                    *Invoice Issued
                  </span>
                  <DatePicker
                    slotProps={{
                      textField: {
                        size: 'small',
                        variant: 'outlined',
                        color: 'info',
                      },
                    }}
                    className="w-full border-black"
                    value={invoiceData.invoiceDate}
                    onChange={(date) => handleDateChange('invoiceDate', date)}
                  />
                </div>
              </Grid>
              <Grid item xs={12} sm={6}>
                <div className="mb-4 flex w-full flex-col">
                  <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
                    *Invoice Due Date
                  </span>
                  <DatePicker
                    slotProps={{
                      textField: {
                        size: 'small',
                        variant: 'outlined',
                        color: 'info',
                      },
                    }}
                    className="w-full border-black"
                    value={invoiceData.dueDate}
                    onChange={(date) => handleDateChange('dueDate', date)}
                  />
                </div>
              </Grid>
            </Grid>

            <FormControl fullWidth className="mb-4">
              <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
                *Payment Id
              </span>
              <Select
                value={invoiceData.paymentMethod}
                onChange={handlePaymentMethodChange as any}
                className="mb-4"
                style={{
                  color: '#4A5568',
                  fontWeight: '500',
                  height: '40px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  paddingRight: '30px',
                }}
              >
                <MenuItem value="crypto">
                  <CurrencyBitcoinIcon className="mr-2" color="primary" />
                  Crypto
                </MenuItem>
                <MenuItem value="bank">
                  <BankIcon className="mr-2" color="primary" />
                  Bank
                </MenuItem>
              </Select>
            </FormControl>

            {invoiceData.paymentMethod === 'crypto' ? (
              <div className="mb-4 flex w-full flex-col">
                <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
                  *Wallet Address
                </span>
                <TextField
                  type="text"
                  id="wallet-address"
                  size="small"
                  name="cryptoAddress"
                  color="info"
                  placeholder="Add Wallet Address"
                  variant="outlined"
                  value={invoiceData.cryptoAddress}
                  onChange={handleInputChange}
                  multiline
                  rows={1}
                  className="w-full"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WalletIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </div>
            ) : (
              <>
                <div className="mb-4 flex w-full flex-col">
                  <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
                    *Name
                  </span>
                  <TextField
                    type="text"
                    id="bank-name"
                    size="small"
                    name="bank-name"
                    color="info"
                    placeholder="Add Name"
                    variant="outlined"
                    value={invoiceData.bankDetails.name}
                    onChange={handleInputChange}
                    className="w-full"
                    InputProps={{
                      startAdornment: (
                        <IconButton edge="start">
                          <BadgeIcon color="primary" />
                        </IconButton>
                      ),
                    }}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="mb-4 flex w-full flex-col">
                    <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
                      *A/c No
                    </span>
                    <TextField
                      type="text"
                      id="bank-account"
                      size="small"
                      name="bank-account"
                      color="info"
                      placeholder="Add Account Number"
                      variant="outlined"
                      value={invoiceData.bankDetails.account}
                      onChange={handleInputChange}
                      className="w-full"
                      InputProps={{
                        startAdornment: (
                          <IconButton edge="start">
                            <WalletIcon color="primary" />
                          </IconButton>
                        ),
                      }}
                    />
                  </div>

                  <div className="mb-4 flex w-full flex-col">
                    <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
                      *IFSC
                    </span>
                    <TextField
                      type="text"
                      id="bank-ifsc"
                      size="small"
                      name="bank-ifsc"
                      color="info"
                      placeholder="Add IFSC Code"
                      variant="outlined"
                      value={invoiceData.bankDetails.ifsc}
                      onChange={handleInputChange}
                      className="w-full"
                      InputProps={{
                        startAdornment: (
                          <IconButton edge="start">
                            <NumbersIcon color="primary" />
                          </IconButton>
                        ),
                      }}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="mb-4 flex w-full flex-col">
                <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
                  *Paying To
                </span>
                <TextField
                  type="text"
                  id="paying-to"
                  size="small"
                  name="payingTo"
                  color="info"
                  placeholder="Add Account Number"
                  variant="outlined"
                  value={invoiceData.payingTo}
                  onChange={handleOwnerInfoChange}
                  className="w-full"
                  InputProps={{
                    startAdornment: (
                      <IconButton edge="start">
                        <PersonIcon color="primary" />
                      </IconButton>
                    ),
                  }}
                />
              </div>

              <div className="mb-4 flex w-full flex-col">
                <span className="mb-2 text-sm font-semibold leading-none text-gray-700">
                  *Company Name
                </span>
                <TextField
                  type="text"
                  id="company-name"
                  size="small"
                  name="companyName"
                  color="info"
                  placeholder="Add Company Name"
                  variant="outlined"
                  value={invoiceData.companyName}
                  onChange={handleOwnerInfoChange}
                  className="w-full"
                  InputProps={{
                    startAdornment: (
                      <IconButton edge="start">
                        <BusinessIcon color="primary" />
                      </IconButton>
                    ),
                  }}
                />
              </div>
            </div>
          </LocalizationProvider>
          <div className="flex items-center justify-end gap-2 md:mt-2">
            <Tooltip title={'Update Payment Info'} arrow>
              <span>
                {showUpdateButton && (
                  <Button
                    // className="bg-white text-neutral-800 hover:bg-neutral-200 border-[1px] border-neutral-800 py-2 px-5 rounded-lg shadow-md"
                    onClick={handleUpdatePaymentInfo}
                  >
                    {!loading ? (
                      'Update Payment Info'
                    ) : (
                      <Spinner className="h-6 w-4 text-green-600" />
                    )}
                  </Button>
                )}
              </span>
            </Tooltip>
            {/* <Tooltip title={"Save"} arrow>
              <span>
                <Button>Save</Button>
              </span>
            </Tooltip> */}
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceModal;
