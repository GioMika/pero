import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { FontState, Font, FontMetadata } from './types';

const initialState: FontState = {
  currentFont: null,
  isLoading: false,
  error: null,
};

export const fontSlice = createSlice({
  name: 'font',
  initialState,
  reducers: {
    createFont: (state, action: PayloadAction<FontMetadata>) => {
      const newFont: Font = {
        id: `font-${Date.now()}`,
        metadata: action.payload,
        metrics: {
          unitsPerEm: 1000,
          ascender: 800,
          descender: -200,
          lineGap: 0,
          capHeight: 700,
          xHeight: 500,
        },
        glyphIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      state.currentFont = newFont;
      state.error = null;
    },

    updateFontMetadata: (state, action: PayloadAction<Partial<FontMetadata>>) => {
      if (state.currentFont) {
        state.currentFont.metadata = {
          ...state.currentFont.metadata,
          ...action.payload,
        };
        state.currentFont.updatedAt = Date.now();
      }
    },

    addGlyphToFont: (state, action: PayloadAction<string>) => {
      if (state.currentFont && !state.currentFont.glyphIds.includes(action.payload)) {
        state.currentFont.glyphIds.push(action.payload);
        state.currentFont.updatedAt = Date.now();
      }
    },

    removeGlyphFromFont: (state, action: PayloadAction<string>) => {
      if (state.currentFont) {
        state.currentFont.glyphIds = state.currentFont.glyphIds.filter(
            (id) => id !== action.payload
        );
        state.currentFont.updatedAt = Date.now();
      }
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearFont: (state) => {
      state.currentFont = null;
      state.error = null;
    },
  },
});

export const {
  createFont,
  updateFontMetadata,
  addGlyphToFont,
  removeGlyphFromFont,
  setLoading,
  setError,
  clearFont,
} = fontSlice.actions;

export default fontSlice.reducer;