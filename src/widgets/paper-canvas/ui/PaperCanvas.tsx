import type { FC } from 'react';
import { useRef, useEffect } from 'react';
import paper from 'paper';
import { useAppSelector, useAppDispatch } from '@shared/lib/hooks';
import { selectEditingGlyph, updateGlyphPath } from '@entities/glyph';
import { ToolType } from '@shared/types';
import { PaperTools } from '../lib/paperTools';
import { PathConverter } from '../lib/pathConverter';
import styles from './PaperCanvas.module.scss';

export const PaperCanvas: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dispatch = useAppDispatch();
  const editingGlyph = useAppSelector(selectEditingGlyph);
  const canvasState = useAppSelector((state) => state.canvas);
  const paperScopeRef = useRef<paper.PaperScope | null>(null);
  const currentToolRef = useRef<paper.Tool | null>(null);
  const guidelinesRef = useRef<paper.Group | null>(null);
  const gridRef = useRef<paper.Group | null>(null);

  // Инициализация Paper.js
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Создаем новый Paper.js scope
    const scope = new paper.PaperScope();
    scope.setup(canvas);
    paperScopeRef.current = scope;

    // Активируем scope
    scope.activate();

    // Устанавливаем размер canvas
    canvas.width = 1000;
    canvas.height = 1000;

    // Настраиваем view
    scope.view.viewSize = new paper.Size(1000, 1000);
    scope.view.center = new paper.Point(500, 0);

    // Рисуем фон
    const background = new paper.Path.Rectangle({
      point: new paper.Point(-2000, -2000),
      size: new paper.Size(4000, 4000),
      fillColor: new paper.Color('#1e1e1e'),
      locked: true,
    });
    background.sendToBack();

    // Рисуем сетку
    if (canvasState.config.showGrid) {
      gridRef.current = PaperTools.drawGrid(canvasState.config.gridSize);
    }

    // Рисуем guidelines
    if (canvasState.config.showGuidelines) {
      guidelinesRef.current = PaperTools.drawGuidelines();
    }

    // Обновляем view
    scope.view.update();

    return () => {
      // Очистка при размонтировании
      if (scope.project) {
        scope.project.clear();
      }
    };
  }, []);

  // Обновление сетки и guidelines
  useEffect(() => {
    if (!paperScopeRef.current) return;

    const scope = paperScopeRef.current;
    scope.activate();

    // Обновляем сетку
    if (gridRef.current) {
      gridRef.current.remove();
      gridRef.current = null;
    }
    if (canvasState.config.showGrid) {
      gridRef.current = PaperTools.drawGrid(canvasState.config.gridSize);
    }

    // Обновляем guidelines
    if (guidelinesRef.current) {
      guidelinesRef.current.remove();
      guidelinesRef.current = null;
    }
    if (canvasState.config.showGuidelines) {
      guidelinesRef.current = PaperTools.drawGuidelines();
    }

    scope.view.update();
  }, [canvasState.config.showGrid, canvasState.config.showGuidelines, canvasState.config.gridSize]);

  // Загрузка текущего глифа
  useEffect(() => {
    if (!paperScopeRef.current || !editingGlyph) return;

    const scope = paperScopeRef.current;
    scope.activate();

    // Удаляем все пути кроме locked элементов (guidelines, grid, background)
    const itemsToRemove: paper.Item[] = [];
    scope.project.activeLayer.children.forEach((child) => {
      if (!child.locked) {
        itemsToRemove.push(child);
      }
    });
    itemsToRemove.forEach((item) => item.remove());

    // Загружаем глиф если есть данные
    if (editingGlyph.path.contours.length > 0) {
      const paperPath = PathConverter.glyphToPaperPath(editingGlyph.path);
      scope.project.activeLayer.addChild(paperPath);
    }

    scope.view.update();
  }, [editingGlyph]);

  // Переключение инструментов
  useEffect(() => {
    if (!paperScopeRef.current) return;

    const scope = paperScopeRef.current;
    scope.activate();

    // Удаляем предыдущий tool
    if (currentToolRef.current) {
      currentToolRef.current.remove();
    }

    // Создаем новый tool
    if (canvasState.activeTool === ToolType.PEN) {
      const penTool = PaperTools.initPenTool((path: paper.Path) => {
        if (!editingGlyph) return;

        // Конвертируем путь и сохраняем
        const glyphPath = PathConverter.paperToGlyphPath(path);
        dispatch(
            updateGlyphPath({
              glyphId: editingGlyph.id,
              path: glyphPath,
            })
        );

        // Обновляем view
        scope.view.update();
      });
      currentToolRef.current = penTool;
    } else if (canvasState.activeTool === ToolType.SELECT) {
      const selectTool = PaperTools.initSelectTool((item) => {
        console.log('Selected:', item);
        scope.view.update();
      });
      currentToolRef.current = selectTool;
    }
  }, [canvasState.activeTool, editingGlyph, dispatch]);

  // Zoom
  useEffect(() => {
    if (!paperScopeRef.current) return;

    const scope = paperScopeRef.current;
    scope.activate();
    scope.view.zoom = canvasState.viewport.zoom;
    scope.view.update();
  }, [canvasState.viewport.zoom]);

  return (
      <div className={styles.container}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <div className={styles.info}>
          <span>Zoom: {Math.round(canvasState.viewport.zoom * 100)}%</span>
          <span>Tool: {canvasState.activeTool}</span>
          {editingGlyph && <span>Editing: {editingGlyph.unicode}</span>}
        </div>
        <div className={styles.hint}>
          {canvasState.activeTool === ToolType.PEN && (
              <span>✏️ Click to add points | Enter to close path | Esc to cancel</span>
          )}
          {canvasState.activeTool === ToolType.SELECT && (
              <span>👆 Click to select path | Drag to move</span>
          )}
        </div>
      </div>
  );
};