"use client";
import React, { useState, ChangeEvent } from "react";
import {
  TextField,
  MenuItem,
  Select,
  FormControl,
  IconButton,
  Tooltip,
  Grid,
  SelectChangeEvent,
  InputAdornment,
} from "@mui/material";
import { Button } from "@/components/elements/Button";
import {
  AccountBalanceWallet as WalletIcon,
  AccountBalance as BankIcon,
} from "@mui/icons-material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";

interface BankDetails {
  name: string;
  account: string;
  ifsc: string;
}

const InvoiceModal: React.FC = () => {
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>("bank");
  const [cryptoAddress, setCryptoAddress] = useState<string>(
    "0x94751a6ecfd0f849286fe6c399eb0ac3bf05b141f"
  );
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    name: "SUBHAKAR TIKKIREDDY",
    account: "145410010035399",
    ifsc: "UBIN0836531",
  });

  const handlePaymentMethodChange = (event: SelectChangeEvent<string>) => {
    setPaymentMethod(event.target.value);
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    field: keyof BankDetails
  ) => {
    setBankDetails({ ...bankDetails, [field]: event.target.value });
  };

  return (
    <div className="p-6 rounded-lg shadow-lg border-2  w-full mt-4 max-w-lg mx-auto">
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
            name="invoice-id"
            color="info"
            placeholder="Add Invoice Id"
            variant="outlined"
            className="w-full"
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
                value={invoiceDate}
                onChange={setInvoiceDate}
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
                value={dueDate}
                onChange={setDueDate}
              />
            </div>
          </Grid>
        </Grid>

        <FormControl fullWidth className="mb-4">
          <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
            *Payment Id
          </span>
          <Select
            value={paymentMethod}
            onChange={handlePaymentMethodChange}
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
              <WalletIcon className="mr-2" color="primary" />
              Crypto
            </MenuItem>
            <MenuItem value="bank">
              <BankIcon className="mr-2" color="primary" />
              Bank
            </MenuItem>
          </Select>
        </FormControl>

        {paymentMethod === "crypto" ? (
          <div className="mb-4 flex flex-col w-full">
            <span className="text-sm font-semibold mb-2 leading-none text-gray-700">
              *Wallet Address
            </span>
            <TextField
              type="text"
              id="wallet-address"
              size="small"
              name="wallet-address"
              color="info"
              placeholder="Add Wallet Address"
              variant="outlined"
              value={cryptoAddress}
              onChange={(e) => setCryptoAddress(e.target.value)}
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
                value={bankDetails.name}
                onChange={(e: any) => handleInputChange(e, "name")}
                className="w-full"
                InputProps={{
                  startAdornment: (
                    <IconButton edge="start">
                      <BankIcon color="primary" />
                    </IconButton>
                  ),
                }}
              />
            </div>

            <div className="flex md:flex-col gap-2 ">
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
                  value={bankDetails.account}
                  onChange={(e: any) => handleInputChange(e, "account")}
                  className="w-full"
                  InputProps={{
                    startAdornment: (
                      <IconButton edge="start">
                        <BankIcon color="primary" />
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
                  value={bankDetails.ifsc}
                  onChange={(e: any) => handleInputChange(e, "ifsc")}
                  className="w-full"
                  InputProps={{
                    startAdornment: (
                      <IconButton edge="start">
                        <BankIcon color="primary" />
                      </IconButton>
                    ),
                  }}
                />
              </div>
            </div>
          </>
        )}
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
