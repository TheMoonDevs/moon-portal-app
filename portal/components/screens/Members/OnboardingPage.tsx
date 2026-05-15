/* eslint-disable @next/next/no-img-element */
'use client';
import { HOUSEID, USERVERTICAL } from '@db/client';
import { TextField, Tooltip } from '@mui/material';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import { REGEXP_ONLY_CHARS } from 'input-otp';
import { CircleCheck, CircleX, Info } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { Button } from '@/components/elements/Button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/elements/InputOtp';
import { Spinner } from '@/components/elements/Loaders';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/elements/Select';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import {
  resetForm,
  updateForm,
} from '@/utils/redux/onboarding/onboarding.slice';
import type { RootState } from '@/utils/redux/store';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';

import { UploadAvatar } from './UploadAvatar';

interface OnboardingPageProps {
  onClose?: () => void;
}

export function OnboardingPage({ onClose }: OnboardingPageProps) {
  const dispatch = useAppDispatch();
  const formData = useAppSelector((state) => state.onboardingForm);
  const [message, setMessage] = useState('');
  const [messageColor, setMessageColor] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedDOB, setSelectedDOB] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [govtIdLink, setGovtIdLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [submit, setSubmit] = useState(false);
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>,
  ) => {
    const { name, value } = e.target;
    dispatch(updateForm({ name: name as keyof typeof formData, value }));
  };

  const handleSelectChange = (value: string, name: keyof typeof formData) => {
    dispatch(updateForm({ name, value }));
  };
  console.log('vertical', formData.userVertical);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUsernameValid) {
      toast.error('Please enter a valid username');
      return;
    }
    setSubmit(true);
    // Concatenate first name and last name
    const fullName = `${formData.firstName} ${formData.lastName}`;
    const updatedFormData = {
      ...formData,
      name: fullName,
      username: username,
      passcode: password,
      dateOfBirth: selectedDOB,
      startDate: selectedStartDate,
    };
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
        body: JSON.stringify(updatedFormData),
      });

      if (response.ok) {
        toast('Thank you for filling the form!!', {
          description: `Welcome aboard, ${fullName}! We're delighted to have you join our team!`,
          duration: 2500,
        });
        dispatch(resetForm());
        setUsername('');
        setPassword('');
        if (onClose) onClose();
      } else {
        toast.error('Failed To Submit Form');
        console.error('Failed to submit form');
      }
    } catch (error) {
      console.error('An error occurred:', error);
    } finally {
      setSubmit(false);
    }
  };

  const handleUsernameInput = async (username: any, password: any) => {
    console.log('handleUsernameInput called with username:', username);
    try {
      setLoading(true);
      setMessageColor('');

      const response = await fetch(
        `/api/onboarding?username=${username}&password=${password}`,
        {
          method: 'GET',
        },
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('API response data:', data);

      if (data.message === 'Username is already taken') {
        setMessage('Username is taken');
        setMessageColor('red');
        setIsUsernameValid(false);
      } else {
        setMessage('Good to go');
        setMessageColor('green');
        setIsUsernameValid(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('An error occurred');
      setMessageColor('red');
      setIsUsernameValid(false);
    } finally {
      setLoading(false);
    }
  };

  // console.log("selectedDateOfBirth:", selectedDOB);
  const showMessage = (newMessage: string, newMessageColor: string) => {
    if (newMessage !== '' && newMessageColor !== '') {
      setMessage(newMessage);
      setMessageColor(newMessageColor);
    }
  };

  const handleUsernameChange = (newValue: any) => {
    const upperCaseValue = newValue.toUpperCase();
    setUsername(upperCaseValue);
  };

  const handlePasswordChange = (newValue: any) => {
    setPassword(newValue);
  };

  const handleDateChange = (selectedDate: string) => {
    if (selectedDate) {
      const formattedDate = new Date(selectedDate).toISOString().split('T')[0];
      setSelectedDOB(formattedDate);
    } else {
      // Clear the selected date
      setSelectedDOB('');
    }
  };

  useEffect(() => {
    if (username.length === 3 && password.length === 3) {
      handleUsernameInput(username, password);
    }
    setMessage('');
    setMessageColor('');
  }, [username, password]);

  const avatarUrl = useAppSelector(
    (state: RootState) => state.onboardingForm.avatar,
  );

  const style = {
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    py: 4,
    px: 0.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  };

  const InputStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '0.75rem',
      width: '100%',
      borderWidth: '2px',
      '& fieldset': {
        border: 'none',
        borderColor: '#cccccc',
      },
      '&:hover fieldset': {
        borderColor: '#cccccc',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#cccccc',
        borderWidth: '3px',
      },
      '&.Mui-focused': {
        borderColor: '#9ca3af',
      },
    },
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Modal
        open={true}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        className="h-full overflow-y-auto"
      >
        <Box sx={style} className="flex w-full items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="relative m-px w-full max-w-[40rem] rounded-3xl border border-gray-300"
          >
            <img
              className="absolute left-5 top-20 size-20 rounded-full bg-white bg-cover p-0"
              src={avatarUrl ? avatarUrl : '/icons/placeholderAvatar.svg'}
              alt="Profile Avatar"
            />
            <div className="h-[120px] rounded-t-3xl bg-gray-200"></div>
            <div className="p-6">
              <div className="flex flex-col gap-4">
                <div className="mt-10 h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>Name:</label>
                  <div className="flex w-full max-w-[23rem] gap-4">
                    <TextField
                      name="firstName"
                      type="text"
                      size="small"
                      required
                      color="info"
                      value={formData.firstName}
                      onChange={handleChange}
                      sx={InputStyles}
                      InputLabelProps={{
                        shrink: false,
                      }}
                      InputProps={{
                        notched: false,
                      }}
                    />
                    <TextField
                      name="lastName"
                      type="text"
                      size="small"
                      required
                      color="info"
                      variant="outlined"
                      value={formData.lastName}
                      onChange={handleChange}
                      InputLabelProps={{
                        shrink: false,
                      }}
                      InputProps={{
                        notched: false,
                      }}
                      sx={InputStyles}
                    />
                  </div>
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>

                <div className="flex flex-wrap items-center justify-between">
                  <label>Email:</label>
                  <TextField
                    name="email"
                    type="email"
                    size="small"
                    required
                    color="info"
                    variant="outlined"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full max-w-[23rem]"
                    InputLabelProps={{
                      shrink: false,
                    }}
                    InputProps={{
                      notched: false,
                    }}
                    sx={InputStyles}
                  />
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>Upload Avatar:</label>
                  <UploadAvatar />
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>UPI ID:</label>
                  <TextField
                    type="text"
                    size="small"
                    name="upiId"
                    color="info"
                    variant="outlined"
                    value={formData.upiId}
                    onChange={handleChange}
                    className="w-full max-w-[23rem]"
                    InputLabelProps={{
                      shrink: false,
                    }}
                    InputProps={{
                      notched: false,
                    }}
                    sx={InputStyles}
                  />
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>Date of Birth:</label>
                  <DatePicker
                    slotProps={{
                      textField: {
                        size: 'small',
                        error: false,
                      },
                    }}
                    value={dayjs(selectedDOB)}
                    onChange={(value) => {
                      if (value) {
                        const formattedDate = value.format('YYYY-MM-DD');
                        setSelectedDOB(formattedDate);
                      } else {
                        setSelectedDOB('');
                      }
                    }}
                    className="w-full max-w-[23rem]"
                    sx={InputStyles}
                  />
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>Date of Joining:</label>
                  <DatePicker
                    slotProps={{
                      textField: {
                        size: 'small',
                        error: false,
                      },
                    }}
                    value={dayjs(selectedStartDate)}
                    onChange={(value) => {
                      if (value) {
                        const formattedDate = value.format('YYYY-MM-DD');
                        setSelectedStartDate(formattedDate);
                      } else {
                        setSelectedStartDate('');
                      }
                    }}
                    className="w-full max-w-[23rem]"
                    sx={InputStyles}
                  />
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>Work Hour OverLap:</label>
                  <div className="flex w-full max-w-[23rem] items-center justify-between gap-1">
                    <TextField
                      type="text"
                      size="small"
                      required
                      name="workHourOverlap"
                      color="info"
                      variant="outlined"
                      value={formData.workHourOverlap}
                      onChange={handleChange}
                      className="w-full"
                      InputLabelProps={{
                        shrink: false,
                      }}
                      InputProps={{
                        notched: false,
                      }}
                      sx={InputStyles}
                    />
                    <Tooltip
                      placement="top"
                      title="Time period where colleagues can interact with you. Example: 2pm - 5pm"
                    >
                      <Info className="size-5 cursor-pointer opacity-60" />
                    </Tooltip>
                  </div>
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>Position:</label>
                  <TextField
                    type="text"
                    size="small"
                    required
                    name="position"
                    color="info"
                    variant="outlined"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full max-w-[23rem]"
                    InputLabelProps={{
                      shrink: false,
                    }}
                    InputProps={{
                      notched: false,
                    }}
                    sx={InputStyles}
                  />
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>Phone:</label>
                  <TextField
                    type="tel"
                    size="small"
                    required
                    name="phone"
                    color="info"
                    variant="outlined"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full max-w-[23rem]"
                    InputLabelProps={{
                      shrink: false,
                    }}
                    InputProps={{
                      notched: false,
                    }}
                    sx={InputStyles}
                  />
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>City:</label>
                  <TextField
                    type="text"
                    required
                    name="city"
                    size="small"
                    color="info"
                    variant="outlined"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full max-w-[23rem]"
                    InputLabelProps={{
                      shrink: false,
                    }}
                    InputProps={{
                      notched: false,
                    }}
                    sx={InputStyles}
                  />
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>Address:</label>

                  <TextField
                    type="text"
                    required
                    size="small"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full max-w-[23rem]"
                    InputLabelProps={{
                      shrink: false,
                    }}
                    InputProps={{
                      notched: false,
                    }}
                    sx={InputStyles}
                  />
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>Government Id:</label>
                  <TextField
                    name="govtId"
                    type="url"
                    size="small"
                    required
                    color="info"
                    variant="outlined"
                    value={formData.govtId}
                    onChange={handleChange}
                    className="w-full max-w-[23rem]"
                    InputLabelProps={{
                      shrink: false,
                    }}
                    InputProps={{
                      notched: false,
                    }}
                    sx={InputStyles}
                  />
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label htmlFor="username">Passcode:</label>
                  <div className="flex w-full max-w-[23rem] items-center gap-2">
                    <div className="flex items-center gap-4">
                      <InputOTP
                        id="username"
                        maxLength={3}
                        pattern={REGEXP_ONLY_CHARS}
                        inputMode="text"
                        alt="Username input"
                        value={username}
                        required
                        onFocus={() => showMessage('', ' ')}
                        onChange={handleUsernameChange}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <InputOTPSeparator />
                    <InputOTP
                      id="password"
                      maxLength={3}
                      required
                      alt="Password input"
                      value={password}
                      onChange={handlePasswordChange}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                    </InputOTP>
                    {loading ? (
                      <div className="ml-4">
                        <Spinner />
                      </div>
                    ) : message ? (
                      <div className="ml-4">
                        {messageColor === 'red' ? (
                          <Tooltip
                            placement="top"
                            title="Username Already Taken"
                          >
                            <CircleX color="red" className="cursor-pointer" />
                          </Tooltip>
                        ) : (
                          <Tooltip placement="top" title="Username Available">
                            <CircleCheck
                              color="green"
                              className="cursor-pointer"
                            />
                          </Tooltip>
                        )}
                      </div>
                    ) : (
                      <div className="ml-4">
                        <Tooltip
                          placement="top"
                          title="Passcode: Username (3 characters) + Password (3 numbers). Example: Username 'abc' and Password '123' results in 'abc123'."
                        >
                          <Info className="size-5 cursor-pointer opacity-60" />
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>

                <div className="flex flex-wrap items-center justify-between">
                  <label>Role:</label>
                  <Select
                    name="vertical"
                    value={formData.userVertical || USERVERTICAL.DEV}
                    defaultValue={USERVERTICAL.DEV}
                    onValueChange={(value) =>
                      handleSelectChange(value, 'userVertical')
                    }
                  >
                    <SelectTrigger
                      id="user-vertical"
                      className="w-full max-w-[23rem] cursor-pointer rounded-xl border-2 border-gray-300 px-4 py-2"
                    >
                      <SelectValue placeholder={USERVERTICAL.DEV} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {Object.values(USERVERTICAL).map((vertical) => (
                        <SelectItem
                          key={vertical}
                          value={vertical}
                          onClick={() =>
                            handleSelectChange(vertical, 'userVertical')
                          }
                          className="cursor-pointer rounded-lg hover:bg-gray-200"
                        >
                          {vertical}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>

                <div className="flex flex-wrap items-center justify-between">
                  <label>House:</label>
                  <Select
                    name="house"
                    value={formData.house || HOUSEID.PRODUCT_TECH}
                    defaultValue={HOUSEID.PRODUCT_TECH}
                    onValueChange={(value) =>
                      handleSelectChange(value, 'house')
                    }
                  >
                    <SelectTrigger
                      id="house"
                      className="w-full max-w-[23rem] cursor-pointer rounded-xl border-2 border-gray-300 px-4 py-2"
                    >
                      <SelectValue placeholder={'Select House'} />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {Object.values(HOUSEID).map((house) => (
                        <SelectItem
                          key={house}
                          value={house}
                          onClick={() => handleSelectChange(house, 'house')}
                          className="cursor-pointer rounded-lg hover:bg-gray-200"
                        >
                          {house}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>TimeZone:</label>
                  <div className="flex w-full max-w-[23rem] items-center justify-between gap-1">
                    <TextField
                      type="text"
                      required
                      size="small"
                      name="timezone"
                      color="info"
                      variant="outlined"
                      value={formData.timezone}
                      onChange={handleChange}
                      className="w-full"
                      InputLabelProps={{
                        shrink: false,
                      }}
                      InputProps={{
                        notched: false,
                      }}
                      sx={InputStyles}
                    />
                    <Tooltip
                      placement="top"
                      title="Enter your local timezone. Example: GMT+5:30"
                    >
                      <Info className="size-5 cursor-pointer opacity-60" />
                    </Tooltip>
                  </div>
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="flex flex-wrap items-center justify-between">
                  <label>Country Code:</label>
                  <div className="flex w-full max-w-[23rem] items-center justify-between gap-1">
                    <TextField
                      type="text"
                      required
                      size="small"
                      name="countryCode"
                      color="info"
                      variant="outlined"
                      value={formData.countryCode}
                      onChange={handleChange}
                      className="w-full"
                      InputLabelProps={{
                        shrink: false,
                      }}
                      InputProps={{
                        notched: false,
                      }}
                      sx={InputStyles}
                    />
                    <Tooltip
                      placement="top"
                      title="Enter your country code. Example: +91"
                    >
                      <Info className="size-5 cursor-pointer opacity-60" />
                    </Tooltip>
                  </div>
                </div>
                <div className="h-px w-full bg-gray-200 px-10"></div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="ml-auto flex gap-5">
                    <Button type="submit" disabled={loading}>
                      {submit ? (
                        <>
                          <Spinner className="size-3" /> Submitting
                        </>
                      ) : (
                        'Submit'
                      )}
                    </Button>
                  </div>
                </div>
                <Toaster />
              </div>
            </div>
          </form>
        </Box>
      </Modal>
    </LocalizationProvider>
  );
}
