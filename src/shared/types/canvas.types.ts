import { ToolType } from './tools';

export interface CanvasConfig {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  showGuidelines: boolean;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

export interface ViewportState {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface CanvasState {
  config: CanvasConfig;
  viewport: ViewportState;
  activeTool: ToolType;
  isDrawing: boolean;
}