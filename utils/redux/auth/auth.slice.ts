import { User } from "@prisma/client";
import { createSlice } from "@reduxjs/toolkit";

export const uiSlice = createSlice({
  name: "ui",
  initialState: {
    user: null as User | null,
  },
  reducers: {
    setReduxUser: (state, action) => {
      state.user = action.payload;
    },
  },
});

const { actions, reducer } = uiSlice;

// Only Slice Actions are generated here, refer sharedActions for others.
export const { setReduxUser } = actions;

export default reducer;
