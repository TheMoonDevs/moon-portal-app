import { createSlice } from '@reduxjs/toolkit';
interface MonthlyTargetsState {
  incompleteTargets: number;
  completedTargets: number;
  targetsMarkdown: string;
}

const initialState: MonthlyTargetsState = {
  incompleteTargets: 0,
  completedTargets: 0,
  targetsMarkdown: '*',
};

export const monthlyTargetsSlice = createSlice({
  name: 'monthlyTargets',
  initialState,
  reducers: {
    setIncompleteTargets: (state, action) => {
      state.incompleteTargets = action.payload;
    },
    setCompletedTargets: (state, action) => {
      state.completedTargets = action.payload;
    },
    setTargetsMarkdown: (state, action) => {
      state.targetsMarkdown = action.payload;
    },
  },
});

export const { setIncompleteTargets, setCompletedTargets, setTargetsMarkdown } =
  monthlyTargetsSlice.actions;

export default monthlyTargetsSlice.reducer;
