import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Dispatch } from "redux";

interface SearchState {
  term: string;
}

const initialState: SearchState = {
  term: "",
};

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    setSearchTerm(state, action: PayloadAction<string>) {
      state.term = action.payload;
    },
  },
});

export const { setSearchTerm } = searchSlice.actions;

// Action creator to update search term
export const updateSearchTerm = (term: string) => (dispatch: Dispatch) => {
  dispatch(setSearchTerm(term));
};

export default searchSlice.reducer;
