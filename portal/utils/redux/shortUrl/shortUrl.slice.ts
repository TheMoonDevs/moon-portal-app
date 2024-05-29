// reducers/shortUrlSlice.js
import { createSlice } from "@reduxjs/toolkit";

interface ILinks {
  id: string;
  slug: string;
  redirectTo: string;
  createdAt: Date;
}

export const shortUrlSlice = createSlice({
  name: "shortUrl",
  initialState: {
    allLinks: [] as ILinks[],
  },
  reducers: {
    setAllLinks: (state, action) => {
      state.allLinks = action.payload;
    },
    addLink: (state, action) => {
      state.allLinks = [action.payload, ...state.allLinks];
    },
  },
});

export const { setAllLinks, addLink } = shortUrlSlice.actions;

export default shortUrlSlice.reducer;
