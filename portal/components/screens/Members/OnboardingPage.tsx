"use client";
import { Toaster, toast } from "sonner";
import { Textarea } from "@/components/elements/Textarea";
import { Button } from "@/components/elements/Button";
import { Input } from "@/components/elements/Input";
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
import { Tooltip } from "@mui/material";
import DatePicker from "./DatePicker";
import { Spinner } from "@/components/elements/Loaders";

interface OnboardingPageProps {
  onClose?: () => void;
}

export function OnboardingPage({ onClose }: OnboardingPageProps) {
  const dispatch = useAppDispatch();
  const formData = useAppSelector((state) => state.onboardingForm);
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>
  ) => {
    const { name, value } = e.target;
    dispatch(updateForm({ name: name as keyof typeof formData, value }));
  };

  const handleSelectChange = (value: string, name: keyof typeof formData) => {
    dispatch(updateForm({ name, value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        console.error("Failed to submit form");
      }
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  const handleUsernameInput = async (username: any, password: any) => {
    console.log("handleUsernameInput called with username:", username);
    try {
      setLoading(true);
      setMessageColor("");

      const response = await fetch(
        `/api/onboarding?username=${username}&password=${password}`,
        {
          method: "GET",
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("API response data:", data);

      if (data.status === 409) {
        setMessage("Username is taken");
        setMessageColor("red");
      } else {
        setMessage("Good to go");
        setMessageColor("green");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage("An error occurred");
      setMessageColor("red");
    } finally {
      setLoading(false);
    }
  };

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
      handleUsernameInput(username, password);
    }
    setMessage("");
    setMessageColor("");
  }, [username, password]);

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-[60rem] mx-auto p-6 my-8 border border-gray-400 rounded-lg shadow-xl"
    >
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input
          type="text"
          placeholder="First name"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
        />

        <Input
          type="text"
          placeholder="Last name"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
        />
      </div>

      <Input
        type="email"
        placeholder="Email address"
        name="email"
        value={formData.email}
        onChange={handleChange}
        className="mb-4"
      />

      <UploadAvatar />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input
          type="text"
          placeholder="UPI ID"
          name="upiId"
          value={formData.upiId}
          onChange={handleChange}
        />

        {/* Date of Birth */}
        <DatePicker onDateChange={handleDateChange} />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex justify-between items-center gap-1">
          <Input
            type="text"
            placeholder="Work Hour Overlap"
            name="workHourOverlap"
            value={formData.workHourOverlap}
            onChange={handleChange}
            className=""
          />
          <Tooltip
            placement="top"
            title="Time period where colleagues can interact with you. Example: 2pm - 5pm"
          >
            <Info className="opacity-60 h-5 w-5 cursor-pointer" />
          </Tooltip>
        </div>

        <Input
          type="text"
          placeholder="Position"
          name="position"
          value={formData.position}
          onChange={handleChange}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input
          type="text"
          placeholder="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
        />
        <Input
          type="text"
          placeholder="City"
          name="city"
          value={formData.city}
          onChange={handleChange}
        />
      </div>
      <Textarea
        placeholder="Address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        className="mb-4"
      />

      <div className="flex gap-2 items-center mb-4">
        <div className="flex gap-4 items-center">
          <label htmlFor="username">Passcode :</label>
          <InputOTP
            id="username"
            maxLength={3}
            pattern={REGEXP_ONLY_CHARS}
            alt="Username input"
            value={username}
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
        ) : (
          message && (
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
          )
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Select>
          <SelectTrigger id="user-vertical">
            <SelectValue placeholder="User Vertical" />
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
          <Input
            type="text"
            placeholder="Timezone"
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
          />
          <Tooltip
            placement="top"
            title="Enter your local timezone. Example: GMT+5:30"
          >
            <Info className="opacity-60 h-5 w-5 cursor-pointer" />
          </Tooltip>
        </div>
        <div className="flex justify-between items-center gap-1">
          <Input
            type="text"
            placeholder="Country Code"
            name="countryCode"
            value={formData.countryCode}
            onChange={handleChange}
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
          <Button type="submit">Submit</Button>
        </div>
      </div>
      <Toaster />
    </form>
  );
}
