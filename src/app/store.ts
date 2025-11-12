import { configureStore } from '@reduxjs/toolkit';
import { fontReducer } from '@entities/font';
import { glyphReducer } from '@entities/glyph';
import { canvasReducer } from '@widgets/editor-canvas';

export const store = configureStore({
  reducer: {
    font: fontReducer,
    glyph: glyphReducer,
    canvas: canvasReducer,
  },
  middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;