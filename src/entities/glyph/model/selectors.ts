import type { RootState } from '@app/store';

export const selectAllGlyphs = (state: RootState) => state.glyph.glyphs;
export const selectGlyphById = (glyphId: string) => (state: RootState) =>
    state.glyph.glyphs[glyphId];
export const selectSelectedGlyphId = (state: RootState) => state.glyph.selectedGlyphId;
export const selectSelectedGlyph = (state: RootState) => {
  const id = state.glyph.selectedGlyphId;
  return id ? state.glyph.glyphs[id] : null;
};
export const selectEditingGlyphId = (state: RootState) => state.glyph.editingGlyphId;
export const selectEditingGlyph = (state: RootState) => {
  const id = state.glyph.editingGlyphId;
  return id ? state.glyph.glyphs[id] : null;
};
export const selectCopiedGlyph = (state: RootState) => state.glyph.copiedGlyph;
export const selectGlyphsByUnicode = (unicode: string) => (state: RootState) =>
    Object.values(state.glyph.glyphs).filter((g) => g.unicode === unicode);