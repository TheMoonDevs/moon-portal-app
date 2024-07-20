import { createSlice } from "@reduxjs/toolkit"; // Adjust the import path as needed
interface LaterTodosState {
  incompleteTodos: number;
  completedTodos: number;
  todoMarkdown: string;
}

const initialState: LaterTodosState = {
  incompleteTodos: 0,
  completedTodos: 0,
  todoMarkdown: "*",
};

export const laterTodosSlice = createSlice({
  name: "laterTodos",
  initialState,
  reducers: {
    setIncompleteTodos: (state, action) => {
      state.incompleteTodos = action.payload;
    },
    setCompletedTodos: (state, action) => {
      state.completedTodos = action.payload;
    },
    setTodoMarkdown: (state, action) => {
      state.todoMarkdown = action.payload;
    },
  },
});

export const { setIncompleteTodos, setCompletedTodos, setTodoMarkdown } =
  laterTodosSlice.actions;

export default laterTodosSlice.reducer;
