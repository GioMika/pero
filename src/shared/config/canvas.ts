import type { CanvasConfig } from '@shared/types';

// Экспортируем ToolType
export { ToolType } from '@shared/types';

export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  width: 1000,
  height: 1000,
  gridSize: 50,
  showGrid: true,
  showGuidelines: true,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 10,
};

export const CANVAS_COLORS = {
  background: '#1e1e1e',
  grid: '#2a2a2a',
  guideline: '#4a4a4a',
  path: '#ffffff',
  selectedPath: '#00aaff',
  point: '#ffffff',
  selectedPoint: '#00aaff',
  handleLine: '#888888',
};