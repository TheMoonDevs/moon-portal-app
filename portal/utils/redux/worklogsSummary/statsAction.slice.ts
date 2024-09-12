import { createSlice } from "@reduxjs/toolkit";

interface StatsState {
}

const initialState: StatsState = {
};

export const statsActionSlice = createSlice({
  name: "statsActionSlice",
  initialState,
  reducers: {
  },
});

export default statsActionSlice.reducer;
