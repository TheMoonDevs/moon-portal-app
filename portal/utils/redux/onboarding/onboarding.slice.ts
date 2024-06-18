import { USERVERTICAL } from "@prisma/client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  upiId: string;
  dateOfBirth: string;
  city: string;
  position: string;
  workHourOverlap: string;
  address: string;
  username: string;
  passcode: string;
  avatar: string;
  userVertical: string;
  userRole: string;
  timezone: string;
  countryCode: string;
  phone: string;
}

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  upiId: "",
  dateOfBirth: "",
  username: "",
  city: "",
  position: "",
  workHourOverlap: "",
  address: "",
  passcode: "",
  avatar: "",
  userVertical: USERVERTICAL.DEV,
  userRole: "",
  timezone: "",
  countryCode: "",
  phone: "",
};

const formSlice = createSlice({
  name: "form",
  initialState,
  reducers: {
    updateForm(
      state,
      action: PayloadAction<{ name: keyof FormState; value: string }>
    ) {
      state[action.payload.name] = action.payload.value;
    },
    resetForm(state) {
      Object.keys(state).forEach((key) => {
        state[key as keyof FormState] = initialState[key as keyof FormState];
      });
    },
    updateAvatarUrl(state, action: PayloadAction<string>) {
      state.avatar = action.payload;
    },
  },
});

export const { updateForm, resetForm, updateAvatarUrl } = formSlice.actions;
export default formSlice.reducer;
