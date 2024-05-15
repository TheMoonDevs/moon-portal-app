import { User, ZeroRecords } from "@prisma/client";
import { createSlice } from "@reduxjs/toolkit";
export interface IMeetingData {
  id?: string;
  type: string;
  title: string;
  date: string;
  members: User[];
}
export const zerotrackerSlice = createSlice({
  name: "zerotrackerSlice",
  initialState: {
    loggedInUserMeetingRecord: {},
  } as {
    loggedInUserMeetingRecord: ZeroRecords | any;
  },
  reducers: {
    setLoggedInUserMeetingRecord: (state, action) => {
      state.loggedInUserMeetingRecord = action.payload;
    },

    deleteLoggedInUserMeetingRecord: (state, action) => {
      state.loggedInUserMeetingRecord = {
        ...state.loggedInUserMeetingRecord,
        allMeetings: state.loggedInUserMeetingRecord.allMeetings.filter(
          (meeting: IMeetingData) => meeting.id !== action.payload.id
        ),
      };
    },
  },
});

export const { setLoggedInUserMeetingRecord, deleteLoggedInUserMeetingRecord } =
  zerotrackerSlice.actions;

export default zerotrackerSlice.reducer;
