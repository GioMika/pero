import type { FC, MouseEvent } from 'react';
import { useRef, useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@shared/lib/hooks';
import { selectEditingGlyph, updateGlyphPath, addPointToContour } from '@entities/glyph';
import { setZoom, panViewport } from '@widgets/editor-canvas';
import { CANVAS_COLORS } from '@shared/config';
import { ToolType } from '@shared/types';
import styles from './EditorCanvas.module.scss';

export const EditorCanvas: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const editingGlyph = useAppSelector(selectEditingGlyph);
  const canvasState = useAppSelector((state) => state.canvas);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

  // Обработчик wheel с preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(
          canvasState.config.minZoom,
          Math.min(canvasState.config.maxZoom, canvasState.viewport.zoom * zoomFactor)
      );
      dispatch(setZoom(newZoom));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasState.viewport.zoom, canvasState.config.minZoom, canvasState.config.maxZoom, dispatch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasState.config.width;
    canvas.height = canvasState.config.height;

    ctx.save();
    ctx.translate(canvasState.viewport.offsetX, canvasState.viewport.offsetY);
    ctx.scale(canvasState.viewport.zoom, canvasState.viewport.zoom);

    ctx.fillStyle = CANVAS_COLORS.background;
    ctx.fillRect(
        -canvasState.viewport.offsetX / canvasState.viewport.zoom,
        -canvasState.viewport.offsetY / canvasState.viewport.zoom,
        canvas.width / canvasState.viewport.zoom,
        canvas.height / canvasState.viewport.zoom
    );

    if (canvasState.config.showGrid) {
      drawGrid(ctx, canvas.width, canvas.height, canvasState.config.gridSize);
    }

    if (canvasState.config.showGuidelines) {
      drawGuidelines(ctx, canvas.width, canvas.height);
    }

    if (editingGlyph) {
      drawGlyph(ctx, editingGlyph);
    }

    ctx.restore();
  }, [canvasState, editingGlyph, selectedPointIndex]);

  // Обработка клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(true);
        e.preventDefault();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointIndex !== null) {
        handleDeletePoint();
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        setSelectedPointIndex(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedPointIndex, editingGlyph]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, gridSize: number) => {
    ctx.strokeStyle = CANVAS_COLORS.grid;
    ctx.lineWidth = 1 / canvasState.viewport.zoom;

    const startX = Math.floor((-canvasState.viewport.offsetX / canvasState.viewport.zoom) / gridSize) * gridSize;
    const endX = startX + width / canvasState.viewport.zoom + gridSize;
    const startY = Math.floor((-canvasState.viewport.offsetY / canvasState.viewport.zoom) / gridSize) * gridSize;
    const endY = startY + height / canvasState.viewport.zoom + gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  };

  const drawGuidelines = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Вертикальная центральная линия
    ctx.strokeStyle = CANVAS_COLORS.guideline;
    ctx.lineWidth = 2 / canvasState.viewport.zoom;
    ctx.beginPath();
    ctx.moveTo(500, -height);
    ctx.lineTo(500, height * 2);
    ctx.stroke();

    // Baseline (y = 0) - КРАСНАЯ
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2 / canvasState.viewport.zoom;
    ctx.beginPath();
    ctx.moveTo(-width, 0);
    ctx.lineTo(width * 2, 0);
    ctx.stroke();

    // Ascender (y = -800) - ЗЕЛЕНАЯ
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1 / canvasState.viewport.zoom;
    ctx.beginPath();
    ctx.moveTo(-width, -800);
    ctx.lineTo(width * 2, -800);
    ctx.stroke();

    // Descender (y = 200) - СИНЯЯ
    ctx.strokeStyle = '#0000ff';
    ctx.beginPath();
    ctx.moveTo(-width, 200);
    ctx.lineTo(width * 2, 200);
    ctx.stroke();

    // Cap height (y = -700) - ПУНКТИРНАЯ
    ctx.strokeStyle = CANVAS_COLORS.guideline;
    ctx.lineWidth = 1 / canvasState.viewport.zoom;
    ctx.setLineDash([5 / canvasState.viewport.zoom, 5 / canvasState.viewport.zoom]);
    ctx.beginPath();
    ctx.moveTo(-width, -700);
    ctx.lineTo(width * 2, -700);
    ctx.stroke();

    // X-height (y = -500) - ПУНКТИРНАЯ
    ctx.beginPath();
    ctx.moveTo(-width, -500);
    ctx.lineTo(width * 2, -500);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawGlyph = (ctx: CanvasRenderingContext2D, glyph: any) => {
    if (!glyph.path || glyph.path.contours.length === 0) return;

    ctx.strokeStyle = CANVAS_COLORS.path;
    ctx.fillStyle = CANVAS_COLORS.path;
    ctx.lineWidth = 2 / canvasState.viewport.zoom;

    let globalPointIndex = 0;

    glyph.path.contours.forEach((contour: any) => {
      if (contour.points.length === 0) return;

      ctx.beginPath();
      const firstPoint = contour.points[0];
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < contour.points.length; i++) {
        const point = contour.points[i];
        ctx.lineTo(point.x, point.y);
      }

      if (contour.closed) {
        ctx.closePath();
      }

      ctx.stroke();

      // Рисуем точки
      contour.points.forEach((point: any) => {
        const isSelected = globalPointIndex === selectedPointIndex;
        const pointRadius = 5 / canvasState.viewport.zoom;

        ctx.beginPath();
        ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#ff0000' : (point.onCurve ? CANVAS_COLORS.point : CANVAS_COLORS.handleLine);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ff0000' : CANVAS_COLORS.selectedPoint;
        ctx.lineWidth = (isSelected ? 3 : 2) / canvasState.viewport.zoom;
        ctx.stroke();

        globalPointIndex++;
      });
    });
  };

  const screenToCanvas = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - canvasState.viewport.offsetX) / canvasState.viewport.zoom;
    const y = (screenY - rect.top - canvasState.viewport.offsetY) / canvasState.viewport.zoom;
    return { x, y };
  };

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (spacePressed || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
      return;
    }

    handleCanvasClick(e);
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      dispatch(panViewport({ dx, dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!editingGlyph || isPanning) return;

    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    if (canvasState.activeTool === ToolType.SELECT) {
      let globalPointIndex = 0;
      let foundPoint = false;

      for (const contour of editingGlyph.path.contours) {
        for (const point of contour.points) {
          const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
          if (distance < 10 / canvasState.viewport.zoom) {
            setSelectedPointIndex(globalPointIndex);
            foundPoint = true;
            break;
          }
          globalPointIndex++;
        }
        if (foundPoint) break;
      }

      if (!foundPoint) {
        setSelectedPointIndex(null);
      }
      return;
    }

    if (canvasState.activeTool === ToolType.PEN) {
      if (editingGlyph.path.contours.length === 0) {
        const newPath = {
          contours: [
            {
              points: [{ x, y, onCurve: true }],
              closed: false,
            },
          ],
        };
        dispatch(updateGlyphPath({ glyphId: editingGlyph.id, path: newPath }));
      } else {
        const lastContourIndex = editingGlyph.path.contours.length - 1;
        dispatch(
            addPointToContour({
              glyphId: editingGlyph.id,
              contourIndex: lastContourIndex,
              point: { x, y, onCurve: true },
            })
        );
      }
      setSelectedPointIndex(null);
    }
  };

  const handleDeletePoint = () => {
    if (selectedPointIndex === null || !editingGlyph) return;

    let globalPointIndex = 0;
    const newContours = editingGlyph.path.contours
        .map((contour: any) => {
          const newPoints = contour.points.filter((_: any) => {
            const currentGlobalIndex = globalPointIndex;
            globalPointIndex++;
            return currentGlobalIndex !== selectedPointIndex;
          });
          return { ...contour, points: newPoints };
        })
        .filter((contour: any) => contour.points.length > 0);

    dispatch(
        updateGlyphPath({
          glyphId: editingGlyph.id,
          path: { contours: newContours },
        })
    );

    setSelectedPointIndex(null);
  };

  const getCursor = () => {
    if (isPanning || spacePressed) return 'grab';
    if (canvasState.activeTool === ToolType.PEN) return 'crosshair';
    if (canvasState.activeTool === ToolType.SELECT) return 'default';
    return 'default';
  };

  return (
      <div className={styles.container} ref={containerRef} tabIndex={0}>
        <canvas
            ref={canvasRef}
            className={styles.canvas}
            style={{ cursor: getCursor() }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
        <div className={styles.info}>
          <span>Zoom: {Math.round(canvasState.viewport.zoom * 100)}%</span>
          <span>Tool: {canvasState.activeTool}</span>
          {editingGlyph && <span>Editing: {editingGlyph.unicode}</span>}
        </div>
        <div className={styles.hint}>
          {canvasState.activeTool === ToolType.PEN && (
              <span>💡 Click to add points | Space+Drag to pan | Scroll to zoom</span>
          )}
          {canvasState.activeTool === ToolType.SELECT && selectedPointIndex !== null && (
              <span>🗑️ Press Delete to remove | Space+Drag to pan</span>
          )}
          {canvasState.activeTool === ToolType.SELECT && selectedPointIndex === null && (
              <span>👆 Click point to select | Space+Drag to pan | Scroll to zoom</span>
          )}
        </div>
      </div>
  );
};