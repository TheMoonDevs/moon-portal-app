import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  incompleteTodos: 0,
};

export const laterTodosSlice = createSlice({
  name: 'laterTodos',
  initialState,
  reducers: {
    setIncompleteTodos: (state, action) => {
      state.incompleteTodos = action.payload;
    },
  },
});

export const { setIncompleteTodos } = laterTodosSlice.actions;

export default laterTodosSlice.reducer;