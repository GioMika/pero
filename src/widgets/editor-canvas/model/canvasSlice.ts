import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { ToolType, DEFAULT_CANVAS_CONFIG } from '@shared/config';
import type { CanvasState, ViewportState } from '@shared/types';

const initialState: CanvasState = {
  config: DEFAULT_CANVAS_CONFIG,
  viewport: {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  },
  activeTool: ToolType.PEN,
  isDrawing: false,
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setActiveTool: (state, action: PayloadAction<ToolType>) => {
      state.activeTool = action.payload;
    },

    setZoom: (state, action: PayloadAction<number>) => {
      const newZoom = Math.max(
          state.config.minZoom,
          Math.min(state.config.maxZoom, action.payload)
      );
      state.viewport.zoom = newZoom;
    },

    zoomIn: (state) => {
      const newZoom = Math.min(state.viewport.zoom * 1.2, state.config.maxZoom);
      state.viewport.zoom = newZoom;
    },

    zoomOut: (state) => {
      const newZoom = Math.max(state.viewport.zoom / 1.2, state.config.minZoom);
      state.viewport.zoom = newZoom;
    },

    resetZoom: (state) => {
      state.viewport.zoom = 1;
    },

    setViewport: (state, action: PayloadAction<Partial<ViewportState>>) => {
      state.viewport = { ...state.viewport, ...action.payload };
    },

    panViewport: (state, action: PayloadAction<{ dx: number; dy: number }>) => {
      state.viewport.offsetX += action.payload.dx;
      state.viewport.offsetY += action.payload.dy;
    },

    toggleGrid: (state) => {
      state.config.showGrid = !state.config.showGrid;
    },

    toggleGuidelines: (state) => {
      state.config.showGuidelines = !state.config.showGuidelines;
    },

    setIsDrawing: (state, action: PayloadAction<boolean>) => {
      state.isDrawing = action.payload;
    },

    resetCanvas: (state) => {
      state.viewport = initialState.viewport;
      state.activeTool = ToolType.PEN;
      state.isDrawing = false;
    },
  },
});

export const {
  setActiveTool,
  setZoom,
  zoomIn,
  zoomOut,
  resetZoom,
  setViewport,
  panViewport,
  toggleGrid,
  toggleGuidelines,
  setIsDrawing,
  resetCanvas,
} = canvasSlice.actions;

export default canvasSlice.reducer;