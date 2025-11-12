import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface InterpolationState {
  isInterpolating: boolean;
  progress: number;
  totalGlyphs: number;
  processedGlyphs: number;
  error: string | null;
}

const initialState: InterpolationState = {
  isInterpolating: false,
  progress: 0,
  totalGlyphs: 0,
  processedGlyphs: 0,
  error: null,
};

export const interpolationSlice = createSlice({
  name: 'interpolation',
  initialState,
  reducers: {
    startInterpolation: (state, action: PayloadAction<number>) => {
      state.isInterpolating = true;
      state.totalGlyphs = action.payload;
      state.processedGlyphs = 0;
      state.progress = 0;
      state.error = null;
    },

    updateProgress: (state, action: PayloadAction<number>) => {
      state.processedGlyphs = action.payload;
      state.progress = (action.payload / state.totalGlyphs) * 100;
    },

    completeInterpolation: (state) => {
      state.isInterpolating = false;
      state.progress = 100;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isInterpolating = false;
    },

    resetInterpolation: (state) => {
      state.isInterpolating = false;
      state.progress = 0;
      state.totalGlyphs = 0;
      state.processedGlyphs = 0;
      state.error = null;
    },
  },
});

export const {
  startInterpolation,
  updateProgress,
  completeInterpolation,
  setError,
  resetInterpolation,
} = interpolationSlice.actions;

export default interpolationSlice.reducer;