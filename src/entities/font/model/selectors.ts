import type { RootState } from '@app/store';

export const selectCurrentFont = (state: RootState) => state.font.currentFont;
export const selectFontMetadata = (state: RootState) => state.font.currentFont?.metadata;
export const selectFontMetrics = (state: RootState) => state.font.currentFont?.metrics;
export const selectFontGlyphIds = (state: RootState) => state.font.currentFont?.glyphIds || [];
export const selectFontLoading = (state: RootState) => state.font.isLoading;
export const selectFontError = (state: RootState) => state.font.error;