"use client";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/elements/Button";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/elements/Select";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import {
  resetForm,
  updateForm,
} from "@/utils/redux/onboarding/onboarding.slice";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/elements/InputOtp";
import { UploadAvatar } from "./UploadAvatar";
import { REGEXP_ONLY_CHARS } from "input-otp";
import React, { useEffect, useState } from "react";
import { USERVERTICAL } from "@prisma/client";
import { CircleCheck, CircleX, Info } from "lucide-react";
import { TextField, Tooltip } from "@mui/material";
import dayjs from "dayjs";
import { Spinner } from "@/components/elements/Loaders";

interface OnboardingPageProps {
  onClose?: () => void;
}

export default function OnboardingPage({ onClose }: OnboardingPageProps) {
  const dispatch = useAppDispatch();
  const formData = useAppSelector((state) => state.onboardingForm);
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("");
  const [username, setUsername] = useState("");
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [submit, setSubmit] = useState(false);
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>
  ) => {
    const { name, value } = e.target;
    dispatch(updateForm({ name: name as keyof typeof formData, value }));
  };

  const handleSelectChange = (value: string, name: keyof typeof formData) => {
    dispatch(updateForm({ name, value }));
  };
  console.log("vertical", formData.userVertical);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUsernameValid) {
      toast.error("Please enter a valid username");
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
      dateOfBirth: selectedDate,
    };
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedFormData),
      });

      if (response.ok) {
        toast("Thank you for filling the form!!", {
          description: `Welcome aboard, ${fullName}! We're delighted to have you join our team!`,
          duration: 2500,
        });
        dispatch(resetForm());
        setUsername("");
        setPassword("");
        if (onClose) onClose();
      } else {
        toast.error("Failed To Submit Form");
        console.error("Failed to submit form");
      }
    } catch (error) {
      console.error("An error occurred:", error);
    } finally {
      setSubmit(false);
    }
  };

  const handleUsernameInput = async (username: any) => {
    console.log("handleUsernameInput called with username:", username);
    try {
      setLoading(true);
      setMessageColor("");

      const response = await fetch(`/api/onboarding?username=${username}`, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("API response data:", data);

      if (data.message === "Username is already taken") {
        setMessage("Username is taken");
        setMessageColor("red");
        setIsUsernameValid(false);
      } else {
        setMessage("Good to go");
        setMessageColor("green");
        setIsUsernameValid(true);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage("An error occurred");
      setMessageColor("red");
      setIsUsernameValid(false);
    } finally {
      setLoading(false);
    }
  };

  console.log("selectedDate:", selectedDate);
  const showMessage = (newMessage: string, newMessageColor: string) => {
    if (newMessage !== "" && newMessageColor !== "") {
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
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];
      setSelectedDate(formattedDate);
    } else {
      // Clear the selected date
      setSelectedDate("");
    }
  };

  useEffect(() => {
    if (username.length === 3 && password.length === 3) {
      handleUsernameInput(username);
    }
    setMessage("");
    setMessageColor("");
  }, [username, password]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form
        onSubmit={handleSubmit}
        className="max-w-[60rem] mx-auto p-6 my-8 border border-gray-400 rounded-lg shadow-xl"
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <TextField
            label="First Name"
            name="firstName"
            type="text"
            size="small"
            required
            color="info"
            variant="outlined"
            value={formData.firstName}
            onChange={handleChange}
            className=""
          />

          <TextField
            label="Last Name"
            name="lastName"
            type="text"
            size="small"
            required
            color="info"
            variant="outlined"
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>

        <TextField
          label="Email"
          name="email"
          type="email"
          size="small"
          required
          color="info"
          variant="outlined"
          value={formData.email}
          className="w-full"
          onChange={handleChange}
        />

        <UploadAvatar />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <TextField
            type="text"
            label="UPI ID"
            size="small"
            name="upiId"
            color="info"
            variant="outlined"
            className="w-full"
            value={formData.upiId}
            onChange={handleChange}
          />
          {/* Date of Birth */}
          <DatePicker
            label="Date of Birth"
            slotProps={{
              textField: {
                size: "small",
                error: false,
                variant: "outlined",
                color: "info",
              },
            }}
            className="w-full border-black"
            value={dayjs(selectedDate)}
            onChange={(value) => {
              if (value) {
                const formattedDate = value.format("YYYY-MM-DD");
                setSelectedDate(formattedDate);
              } else {
                setSelectedDate("");
              }
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex justify-between items-center gap-1">
            <TextField
              type="text"
              label="Work Hour Overlap"
              size="small"
              required
              name="workHourOverlap"
              color="info"
              variant="outlined"
              value={formData.workHourOverlap}
              onChange={handleChange}
              className="w-full mr-1"
            />
            <Tooltip
              placement="top"
              title="Time period where colleagues can interact with you. Example: 2pm - 5pm"
            >
              <Info className="opacity-60 h-5 w-5 cursor-pointer" />
            </Tooltip>
          </div>

          <TextField
            type="text"
            label="Position"
            size="small"
            required
            name="position"
            color="info"
            variant="outlined"
            value={formData.position}
            onChange={handleChange}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <TextField
            type="tel"
            label="Phone"
            size="small"
            required
            name="phone"
            color="info"
            variant="outlined"
            value={formData.phone}
            onChange={handleChange}
            className="w-full"
          />
          <TextField
            type="text"
            label="City"
            required
            name="city"
            size="small"
            color="info"
            variant="outlined"
            value={formData.city}
            onChange={handleChange}
            className="w-full"
          />
        </div>
        <TextField
          type="text"
          label="Address"
          required
          size="small"
          name="address"
          color="info"
          variant="outlined"
          value={formData.address}
          onChange={handleChange}
          className="w-full mb-4"
        />

        <div className="grid grid-cols-2 gap-4 my-2 items-center">
          <div className="flex gap-2 items-center my-4">
            <div className="flex gap-4 items-center">
              <label htmlFor="username">Passcode :</label>
              <InputOTP
                id="username"
                maxLength={3}
                pattern={REGEXP_ONLY_CHARS}
                alt="Username input"
                value={username}
                required
                onFocus={() => showMessage("", " ")}
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
                {messageColor === "red" ? (
                  <Tooltip placement="top" title="Username Already Taken">
                    <CircleX color="red" className="cursor-pointer" />
                  </Tooltip>
                ) : (
                  <Tooltip placement="top" title="Username Available">
                    <CircleCheck color="green" className="cursor-pointer" />
                  </Tooltip>
                )}
              </div>
            ) : (
              <div className="ml-4">
                <Tooltip
                  placement="top"
                  title="Passcode: Username (3 characters) + Password (3 numbers). Example: Username 'abc' and Password '123' results in 'abc123'."
                >
                  <Info className="opacity-60 h-5 w-5 cursor-pointer" />
                </Tooltip>
              </div>
            )}
          </div>
          <Select
            name="vertical"
            value={formData.userVertical || USERVERTICAL.DEV}
            defaultValue={USERVERTICAL.DEV}
            onValueChange={(value) => handleSelectChange(value, "userVertical")}
          >
            <SelectTrigger id="user-vertical">
              <SelectValue placeholder={USERVERTICAL.DEV} />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {Object.values(USERVERTICAL).map((vertical) => (
                <SelectItem
                  key={vertical}
                  value={vertical}
                  onClick={() => handleSelectChange(vertical, "userVertical")}
                  className="hover:bg-gray-200 rounded-lg cursor-pointer"
                >
                  {vertical}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex justify-between items-center gap-1">
            <TextField
              type="text"
              label="Timezone"
              required
              size="small"
              name="timezone"
              color="info"
              variant="outlined"
              value={formData.timezone}
              onChange={handleChange}
              className="w-full mb-4"
            />
            <Tooltip
              placement="top"
              title="Enter your local timezone. Example: GMT+5:30"
            >
              <Info className="opacity-60 h-5 w-5 cursor-pointer" />
            </Tooltip>
          </div>
          <div className="flex justify-between items-center gap-1">
            <TextField
              type="text"
              label="Country Code"
              required
              size="small"
              name="countryCode"
              color="info"
              variant="outlined"
              value={formData.countryCode}
              onChange={handleChange}
              className="w-full mb-4"
            />
            <Tooltip
              placement="top"
              title="Enter your country code. Example: +91"
            >
              <Info className="opacity-60 h-5 w-5 cursor-pointer" />
            </Tooltip>
          </div>
        </div>
        <div className="flex gap-4 items-center mt-6">
          <div className="ml-auto">
            <Button type="submit" disabled={loading}>
              {submit ? (
                <>
                  <Spinner className="w-3 h-3" /> Submitting
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </div>
        <Toaster />
      </form>
    </LocalizationProvider>
  );
}
