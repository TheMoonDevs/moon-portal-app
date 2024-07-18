import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'; // Adjust the import path as needed
interface LaterTodosState {
  incompleteTodos: number;
  markdownContent: string;
  yearLogData: any; // Replace 'any' with the correct type
}

const initialState: LaterTodosState = {
  incompleteTodos: 0,
  markdownContent: '*', // MARKDOWN_PLACEHOLDER
  yearLogData: null,
};

export const laterTodosSlice = createSlice({
  name: 'laterTodos',
  initialState,
  reducers: {
    setIncompleteTodos: (state, action) => {
      state.incompleteTodos = action.payload;
    },
    setMarkdownContent: (state, action) => {
      state.markdownContent = action.payload;
    },
    updateIncompleteTodos: (state) => {
      const content = state.markdownContent;
      if (content.trim() === '*' || content.trim() === '') {
        state.incompleteTodos = 0;
      } else {
        const totalTodos = (content.match(/\n/g) || []).length + 1;
        const completedTodos = (content.match(/✅/g) || []).length;
        state.incompleteTodos = totalTodos - completedTodos;
      }
    },
  },
});

export const { setIncompleteTodos, setMarkdownContent, updateIncompleteTodos } = laterTodosSlice.actions;

export default laterTodosSlice.reducer;