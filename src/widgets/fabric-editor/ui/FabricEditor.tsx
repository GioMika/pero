import type { FC } from 'react';
import { useRef, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { useAppSelector, useAppDispatch } from '@shared/lib/hooks';
import { selectEditingGlyph, updateGlyphPath } from '@entities/glyph';
import { ToolType } from '@shared/types';
import { FabricTools } from '../lib/fabricTools';
import { FabricConverter } from '../lib/fabricConverter';
import { PropertiesPanel } from './PropertiesPanel';
import { BezierPenTool } from '../lib/bezierPenTool';
import { DirectSelectionTool } from '../lib/directSelectionTool';
import { ConvertAnchorTool } from '../lib/convertAnchorTool';
import { RotateTool } from '../lib/rotateTool';
import styles from './FabricEditor.module.scss';

export const FabricEditor: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const penToolRef = useRef<BezierPenTool | null>(null);
  const directSelectionToolRef = useRef<DirectSelectionTool | null>(null);
  const convertAnchorToolRef = useRef<ConvertAnchorTool | null>(null);
  const rotateToolRef = useRef<RotateTool | null>(null);
  const dispatch = useAppDispatch();
  const editingGlyph = useAppSelector(selectEditingGlyph);
  const canvasState = useAppSelector((state) => state.canvas);
  const [guidelines, setGuidelines] = useState<fabric.Line[]>([]);
  const [grid, setGrid] = useState<fabric.Line[]>([]);

  // Инициализация Fabric canvas
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const canvas = FabricTools.initCanvas(canvasElement);
    fabricCanvasRef.current = canvas;

    // Инициализируем все инструменты
    penToolRef.current = new BezierPenTool(canvas);
    directSelectionToolRef.current = new DirectSelectionTool(canvas);
    convertAnchorToolRef.current = new ConvertAnchorTool(canvas);
    rotateToolRef.current = new RotateTool(canvas);

    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;

    if (canvasState.config.showGrid) {
      const gridLines = FabricTools.drawGrid(canvas, canvasState.config.gridSize);
      setGrid(gridLines);
    }

    if (canvasState.config.showGuidelines) {
      const guideLines = FabricTools.drawGuidelines(canvas);
      setGuidelines(guideLines);
    }

    canvas.on('object:modified', () => {
      saveCurrentGlyph();
    });

    canvas.on('path:created', () => {
      saveCurrentGlyph();
    });

    canvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.shiftKey === true) {
        isDragging = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isDragging) {
        const evt = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosX;
          vpt[5] += evt.clientY - lastPosY;
          canvas.requestRenderAll();
          lastPosX = evt.clientX;
          lastPosY = evt.clientY;
        }
      }
    });

    canvas.on('mouse:up', () => {
      const vpt = canvas.viewportTransform;
      if (vpt) {
        canvas.setViewportTransform(vpt);
      }
      isDragging = false;
      canvas.selection = true;
    });

    canvas.on('mouse:wheel', (opt) => {
      const evt = opt.e as WheelEvent;
      evt.preventDefault();
      evt.stopPropagation();

      const delta = evt.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;

      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;

      const point = new fabric.Point(evt.offsetX, evt.offsetY);
      canvas.zoomToPoint(point, zoom);
    });

    return () => {
      if (penToolRef.current) {
        penToolRef.current.deactivate();
      }
      if (directSelectionToolRef.current) {
        directSelectionToolRef.current.deactivate();
      }
      if (convertAnchorToolRef.current) {
        convertAnchorToolRef.current.deactivate();
      }
      if (rotateToolRef.current) {
        rotateToolRef.current.deactivate();
      }
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    guidelines.forEach((line) => canvas.remove(line));
    grid.forEach((line) => canvas.remove(line));

    if (canvasState.config.showGrid) {
      const gridLines = FabricTools.drawGrid(canvas, canvasState.config.gridSize);
      setGrid(gridLines);
    } else {
      setGrid([]);
    }

    if (canvasState.config.showGuidelines) {
      const guideLines = FabricTools.drawGuidelines(canvas);
      setGuidelines(guideLines);
    } else {
      setGuidelines([]);
    }

    canvas.renderAll();
  }, [canvasState.config.showGrid, canvasState.config.showGuidelines, canvasState.config.gridSize]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !editingGlyph) return;

    if (editingGlyph.path.contours.length > 0) {
      FabricConverter.glyphPathToFabric(editingGlyph.path, canvas);
    } else {
      FabricTools.clearCanvas(canvas);
    }
  }, [editingGlyph]);

  // Переключение инструментов
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (
        !canvas ||
        !penToolRef.current ||
        !directSelectionToolRef.current ||
        !convertAnchorToolRef.current ||
        !rotateToolRef.current
    ) return;

    // Деактивируем все инструменты
    penToolRef.current.deactivate();
    directSelectionToolRef.current.deactivate();
    convertAnchorToolRef.current.deactivate();
    rotateToolRef.current.deactivate();
    FabricTools.disableDrawingMode(canvas);

    // Активируем нужный
    if (canvasState.activeTool === ToolType.PEN) {
      penToolRef.current.activate();
    } else if (canvasState.activeTool === ToolType.DIRECT_SELECT) {
      directSelectionToolRef.current.activate();
    } else if (canvasState.activeTool === ToolType.CONVERT_ANCHOR) {
      convertAnchorToolRef.current.activate();
    } else if (canvasState.activeTool === ToolType.ROTATE) {
      rotateToolRef.current.activate();
    }
  }, [canvasState.activeTool]);

  const saveCurrentGlyph = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !editingGlyph) return;

    const glyphPath = FabricConverter.fabricToGlyphPath(canvas);
    dispatch(
        updateGlyphPath({
          glyphId: editingGlyph.id,
          path: glyphPath,
        })
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        FabricTools.deleteSelected(canvas);
        saveCurrentGlyph();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingGlyph]);

  const handleAddCircle = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    FabricTools.addCircle(canvas, 400, 400);
    saveCurrentGlyph();
  };

  const handleAddRectangle = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    FabricTools.addRectangle(canvas, 400, 400);
    saveCurrentGlyph();
  };

  const handleAddTriangle = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    FabricTools.addTriangle(canvas, 400, 400);
    saveCurrentGlyph();
  };

  const handleAddStar = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    FabricTools.addStar(canvas, 400, 400);
    saveCurrentGlyph();
  };

  const handleAddPolygon = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    FabricTools.addPolygon(canvas, 6, 400, 400);
    saveCurrentGlyph();
  };

  const handleAddEllipse = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    FabricTools.addEllipse(canvas, 400, 400);
    saveCurrentGlyph();
  };

  const handleConvertToPath = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      FabricTools.convertToPath(canvas, activeObject);
      saveCurrentGlyph();
    }
  };

  return (
      <div className={styles.container}>
        <canvas ref={canvasRef} className={styles.canvas} />

        <div className={styles.shapeTools}>
          <button onClick={handleAddCircle} className={styles.shapeButton} title="Circle">
            ⭕
          </button>
          <button onClick={handleAddRectangle} className={styles.shapeButton} title="Rectangle">
            ▭
          </button>
          <button onClick={handleAddTriangle} className={styles.shapeButton} title="Triangle">
            △
          </button>
          <button onClick={handleAddStar} className={styles.shapeButton} title="Star">
            ⭐
          </button>
          <button onClick={handleAddPolygon} className={styles.shapeButton} title="Hexagon">
            ⬡
          </button>
          <button onClick={handleAddEllipse} className={styles.shapeButton} title="Ellipse">
            ⬭
          </button>
        </div>

        <PropertiesPanel
            canvas={fabricCanvasRef.current}
            onConvertToPath={handleConvertToPath}
        />

        <div className={styles.info}>
          <span>Tool: {canvasState.activeTool}</span>
          {editingGlyph && <span>Editing: {editingGlyph.unicode}</span>}
        </div>

        <div className={styles.hint}>
          {canvasState.activeTool === ToolType.PEN && (
              <span>✏️ Click = point | Click+Drag = curve | Enter = close | Backspace = undo</span>
          )}
          {canvasState.activeTool === ToolType.DIRECT_SELECT && (
              <span>🎯 Click path to edit points | Drag points & handles | Delete = remove point</span>
          )}
          {canvasState.activeTool === ToolType.CONVERT_ANCHOR && (
              <span>⚡ Click point to convert: 🔵 Smooth ↔ 🟠 Corner</span>
          )}
          {canvasState.activeTool === ToolType.ROTATE && (
              <span>🔄 Click & drag to rotate | Shift = snap 15° | ← → = rotate 15°</span>
          )}
          {canvasState.activeTool === ToolType.SELECT && (
              <span>👆 Select & edit | Shift+Drag = pan | Scroll = zoom | Delete = remove</span>
          )}
        </div>
      </div>
  );
};