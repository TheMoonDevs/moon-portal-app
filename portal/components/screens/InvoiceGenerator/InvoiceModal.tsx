import React from "react";
import {
  TextField,
  MenuItem,
  Select,
  FormControl,
  IconButton,
  Tooltip,
  Grid,
  InputAdornment,
} from "@mui/material";
import {
  AccountBalanceWallet as WalletIcon,
  AccountBalance as BankIcon,
} from "@mui/icons-material";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import NumbersIcon from "@mui/icons-material/Numbers";
import CurrencyBitcoinIcon from "@mui/icons-material/CurrencyBitcoin";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";
import { Button } from "@/components/elements/Button";
import { InvoiceData } from "./InvoicePage";

interface InvoiceModalProps {
  invoiceData: InvoiceData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDateChange: (
    fieldName: "invoiceDate" | "dueDate",
    newValue: Date | null
  ) => void;
  handlePaymentMethodChange: (
    event: React.ChangeEvent<{ value: unknown }>
  ) => void;
  handleOwnerInfoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoiceData,
  handleInputChange,
  handleDateChange,
  handlePaymentMethodChange,
  handleOwnerInfoChange,
}) => {
  return (
    <div className="p-6 rounded-lg shadow-lg border-2 w-full mt-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-medium font-serif mb-6 text-center">
        Invoice Details
      </h2>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <div className="mb-4 flex flex-col w-full">
          <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
            *Invoice Id
          </span>
          <TextField
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
          <Grid item xs={6}>
            <div className="mb-4 flex flex-col w-full">
              <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
                *Invoice Issued
              </span>
              <DatePicker
                slotProps={{
                  textField: {
                    size: "small",
                    variant: "outlined",
                    color: "info",
                  },
                }}
                className="w-full border-black"
                value={invoiceData.invoiceDate}
                onChange={(date) => handleDateChange("invoiceDate", date)}
              />
            </div>
          </Grid>
          <Grid item xs={6}>
            <div className="mb-4 flex flex-col w-full">
              <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
                *Invoice Due Date
              </span>
              <DatePicker
                slotProps={{
                  textField: {
                    size: "small",
                    variant: "outlined",
                    color: "info",
                  },
                }}
                className="w-full border-black"
                value={invoiceData.dueDate}
                onChange={(date) => handleDateChange("dueDate", date)}
              />
            </div>
          </Grid>
        </Grid>

        <FormControl fullWidth className="mb-4">
          <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
            *Payment Id
          </span>
          <Select
            value={invoiceData.paymentMethod}
            onChange={handlePaymentMethodChange as any}
            className="mb-4"
            style={{
              backgroundColor: "white",
              color: "#4A5568",
              fontWeight: "500",
              height: "40px",
              borderRadius: "4px",
              fontSize: "14px",
              paddingRight: "30px",
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

        {invoiceData.paymentMethod === "crypto" ? (
          <div className="mb-4 flex flex-col w-full">
            <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
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
            <div className="mb-4 flex flex-col w-full">
              <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
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

            <div className="flex  gap-2">
              <div className="mb-4 flex flex-col w-1/2 md:w-full">
                <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
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
                        <AccountBalanceWalletIcon color="primary" />
                      </IconButton>
                    ),
                  }}
                />
              </div>

              <div className="mb-4 flex flex-col w-1/2 md:w-full">
                <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
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
        <div className="flex  gap-2">
          <div className="mb-4 flex flex-col w-1/2 md:w-full">
            <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
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

          <div className="mb-4 flex flex-col w-1/2 md:w-full">
            <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
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
      <div className="flex justify-end mt-2">
        <Tooltip title={"Save"} arrow>
          <span>
            <Button>Save</Button>
          </span>
        </Tooltip>
      </div>
    </div>
  );
};

export default InvoiceModal;
