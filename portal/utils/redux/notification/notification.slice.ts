import { createSlice } from "@reduxjs/toolkit";

export const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    notifications: [],
    notificationsCount: 0,
  },
  reducers: {
    setNotifications: (state, action) => {
      state.notifications = action.payload;
      state.notificationsCount = action.payload.length;
    },
  },
});

export const { setNotifications } = notificationsSlice.actions;

export default notificationsSlice.reducer;
