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
    },
    setNotificationsCount: (state, action) => {
      state.notificationsCount = action.payload;
    },
  },
});

export const { setNotifications, setNotificationsCount } = notificationsSlice.actions;

export default notificationsSlice.reducer;
