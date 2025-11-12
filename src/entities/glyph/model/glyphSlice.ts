import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GlyphState, Glyph, GlyphPath, Point } from './types';

const initialState: GlyphState = {
  glyphs: {},
  selectedGlyphId: null,
  editingGlyphId: null,
  copiedGlyph: null,
};

export const glyphSlice = createSlice({
  name: 'glyph',
  initialState,
  reducers: {
    addGlyph: (state, action: PayloadAction<Glyph>) => {
      state.glyphs[action.payload.id] = action.payload;
    },

    removeGlyph: (state, action: PayloadAction<string>) => {
      delete state.glyphs[action.payload];
      if (state.selectedGlyphId === action.payload) {
        state.selectedGlyphId = null;
      }
      if (state.editingGlyphId === action.payload) {
        state.editingGlyphId = null;
      }
    },

    updateGlyphPath: (state, action: PayloadAction<{ glyphId: string; path: GlyphPath }>) => {
      const glyph = state.glyphs[action.payload.glyphId];
      if (glyph) {
        glyph.path = action.payload.path;
        glyph.isModified = true;
      }
    },

    updateGlyphMetrics: (
        state,
        action: PayloadAction<{ glyphId: string; metrics: Partial<Glyph['metrics']> }>
    ) => {
      const glyph = state.glyphs[action.payload.glyphId];
      if (glyph) {
        glyph.metrics = { ...glyph.metrics, ...action.payload.metrics };
      }
    },

    addPointToContour: (
        state,
        action: PayloadAction<{ glyphId: string; contourIndex: number; point: Point }>
    ) => {
      const glyph = state.glyphs[action.payload.glyphId];
      if (glyph && glyph.path.contours[action.payload.contourIndex]) {
        glyph.path.contours[action.payload.contourIndex].points.push(action.payload.point);
        glyph.isModified = true;
      }
    },

    selectGlyph: (state, action: PayloadAction<string | null>) => {
      state.selectedGlyphId = action.payload;
    },

    setEditingGlyph: (state, action: PayloadAction<string | null>) => {
      state.editingGlyphId = action.payload;
    },

    copyGlyph: (state, action: PayloadAction<string>) => {
      const glyph = state.glyphs[action.payload];
      if (glyph) {
        state.copiedGlyph = { ...glyph };
      }
    },

    pasteGlyph: (state, action: PayloadAction<{ targetUnicode: string }>) => {
      if (state.copiedGlyph) {
        const newGlyph: Glyph = {
          ...state.copiedGlyph,
          id: `glyph-${Date.now()}`,
          unicode: action.payload.targetUnicode,
          name: `glyph-${action.payload.targetUnicode}`,
          isModified: false,
          isInterpolated: false,
        };
        state.glyphs[newGlyph.id] = newGlyph;
      }
    },

    markAsInterpolated: (state, action: PayloadAction<string>) => {
      const glyph = state.glyphs[action.payload];
      if (glyph) {
        glyph.isInterpolated = true;
        glyph.isModified = false;
      }
    },

    clearAllGlyphs: (state) => {
      state.glyphs = {};
      state.selectedGlyphId = null;
      state.editingGlyphId = null;
      state.copiedGlyph = null;
    },
  },
});

export const {
  addGlyph,
  removeGlyph,
  updateGlyphPath,
  updateGlyphMetrics,
  addPointToContour,
  selectGlyph,
  setEditingGlyph,
  copyGlyph,
  pasteGlyph,
  markAsInterpolated,
  clearAllGlyphs,
} = glyphSlice.actions;

export default glyphSlice.reducer;