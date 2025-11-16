import type { FC } from 'react';
import { useRef, useEffect, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { useAppSelector, useAppDispatch } from '@shared/lib/hooks';
import { selectEditingGlyph, updateGlyphPath } from '@entities/glyph';
import { ToolType } from '@shared/types';
import { setActiveTool } from '@widgets/editor-canvas';
import { FabricTools } from '../lib/fabricTools';
import { FabricConverter } from '../lib/fabricConverter';
import { PropertiesPanel } from './PropertiesPanel';
import { PenTool } from '../lib/penTool';
import { DirectSelectionTool } from '../lib/directSelectionTool';
import { ConvertAnchorTool } from '../lib/convertAnchorTool';
import { RotateTool } from '../lib/rotateTool';
import { ScaleTool } from '../lib/scaleTool';
import { ReflectTool } from '../lib/reflectTool';
import { AddAnchorTool } from '../lib/addAnchorTool';
import { DeleteAnchorTool } from '../lib/deleteAnchorTool';
import { PathfinderTool } from '../lib/pathfinderTool';
import { ScissorsTool } from '../lib/scissorsTool';
import { SmoothTool } from '../lib/smoothTool';
import { SimplifyTool } from '../lib/simplifyTool';
import { JoinTool } from '../lib/joinTool';
import { TextTool } from '../lib/textTool';
import styles from './FabricEditor.module.scss';

export const FabricEditor: FC = () => {
  // ============================================================================
  // REFS
  // ============================================================================
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Tool refs
  const penToolRef = useRef<PenTool | null>(null);
  const directSelectionToolRef = useRef<DirectSelectionTool | null>(null);
  const convertAnchorToolRef = useRef<ConvertAnchorTool | null>(null);
  const rotateToolRef = useRef<RotateTool | null>(null);
  const scaleToolRef = useRef<ScaleTool | null>(null);
  const reflectToolRef = useRef<ReflectTool | null>(null);
  const addAnchorToolRef = useRef<AddAnchorTool | null>(null);
  const deleteAnchorToolRef = useRef<DeleteAnchorTool | null>(null);
  const pathfinderToolRef = useRef<PathfinderTool | null>(null);
  const scissorsToolRef = useRef<ScissorsTool | null>(null);
  const smoothToolRef = useRef<SmoothTool | null>(null);
  const simplifyToolRef = useRef<SimplifyTool | null>(null);
  const joinToolRef = useRef<JoinTool | null>(null);
  const textToolRef = useRef<TextTool | null>(null);

  // ============================================================================
  // STATE
  // ============================================================================
  const dispatch = useAppDispatch();
  const editingGlyph = useAppSelector(selectEditingGlyph);
  const canvasState = useAppSelector((state) => state.canvas);

  const [guidelines, setGuidelines] = useState<fabric.Line[]>([]);
  const [grid, setGrid] = useState<fabric.Line[]>([]);

  // ============================================================================
  // HELPERS
  // ============================================================================
  const isMac = useCallback(() => {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }, []);

  const saveCurrentGlyph = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !editingGlyph) return;

    const glyphPath = FabricConverter.fabricToGlyphPath(canvas);
    dispatch(
        updateGlyphPath({
          glyphId: editingGlyph.id,
          path: glyphPath,
        })
    );

    console.log('💾 [FabricEditor] Glyph saved:', editingGlyph.unicode);
  }, [editingGlyph, dispatch]);

  // ============================================================================
  // EFFECT 1: ИНИЦИАЛИЗАЦИЯ CANVAS И ИНСТРУМЕНТОВ
  // ============================================================================
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    console.log('🎨 [FabricEditor] Initializing canvas...');

    // Создаем Fabric canvas
    const canvas = FabricTools.initCanvas(canvasElement);
    fabricCanvasRef.current = canvas;

    // Инициализируем все инструменты
    penToolRef.current = new PenTool(canvas);
    directSelectionToolRef.current = new DirectSelectionTool(canvas);
    convertAnchorToolRef.current = new ConvertAnchorTool(canvas);
    rotateToolRef.current = new RotateTool(canvas);
    scaleToolRef.current = new ScaleTool(canvas);
    reflectToolRef.current = new ReflectTool(canvas);
    addAnchorToolRef.current = new AddAnchorTool(canvas);
    deleteAnchorToolRef.current = new DeleteAnchorTool(canvas);
    pathfinderToolRef.current = new PathfinderTool(canvas);
    scissorsToolRef.current = new ScissorsTool(canvas);
    smoothToolRef.current = new SmoothTool(canvas, 0.5);
    simplifyToolRef.current = new SimplifyTool(canvas, 2.0);
    joinToolRef.current = new JoinTool(canvas, 10);
    textToolRef.current = new TextTool(canvas, () => {
      dispatch(setActiveTool(ToolType.SELECT));
    });

    console.log('✅ [FabricEditor] All tools initialized successfully');

    // Grid и guidelines
    if (canvasState.config.showGrid) {
      const gridLines = FabricTools.drawGrid(canvas, canvasState.config.gridSize);
      setGrid(gridLines);
    }

    if (canvasState.config.showGuidelines) {
      const guideLines = FabricTools.drawGuidelines(canvas);
      setGuidelines(guideLines);
    }

    // ============================================
    // 🖱️ ПАНОРАМИРОВАНИЕ (Space + Drag)
    // ============================================
    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;
    let spacePressed = false;

    const handleSpaceDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        spacePressed = true;
        canvas.defaultCursor = 'grab';
        e.preventDefault();
      }
    };

    const handleSpaceUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressed = false;
        isDragging = false;
        canvas.defaultCursor = 'default';
      }
    };

    canvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (spacePressed) {
        isDragging = true;
        canvas.selection = false;
        canvas.defaultCursor = 'grabbing';
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        evt.preventDefault();
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isDragging && spacePressed) {
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
      if (isDragging) {
        isDragging = false;
        canvas.selection = true;
        canvas.defaultCursor = spacePressed ? 'grab' : 'default';
      }
    });

    document.addEventListener('keydown', handleSpaceDown);
    document.addEventListener('keyup', handleSpaceUp);

    // ============================================
    // 🔍 ЗУМИРОВАНИЕ (Mouse Wheel)
    // ============================================
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

    // ============================================
    // 💾 АВТОСОХРАНЕНИЕ
    // ============================================
    canvas.on('object:modified', () => {
      saveCurrentGlyph();
    });

    canvas.on('path:created', () => {
      saveCurrentGlyph();
    });

    // ============================================
    // 🧹 CLEANUP
    // ============================================
    return () => {
      document.removeEventListener('keydown', handleSpaceDown);
      document.removeEventListener('keyup', handleSpaceUp);

      penToolRef.current?.deactivate();
      directSelectionToolRef.current?.deactivate();
      convertAnchorToolRef.current?.deactivate();
      rotateToolRef.current?.deactivate();
      scaleToolRef.current?.deactivate();
      reflectToolRef.current?.deactivate();
      addAnchorToolRef.current?.deactivate();
      deleteAnchorToolRef.current?.deactivate();
      pathfinderToolRef.current?.deactivate();
      scissorsToolRef.current?.deactivate();
      smoothToolRef.current?.deactivate();
      simplifyToolRef.current?.deactivate();
      joinToolRef.current?.deactivate();
      textToolRef.current?.deactivate();

      canvas.dispose();
      console.log('🧹 [FabricEditor] Canvas disposed');
    };
  }, [dispatch, canvasState.config, saveCurrentGlyph]);

  // ============================================================================
  // EFFECT 2: ОБНОВЛЕНИЕ GRID И GUIDELINES
  // ============================================================================
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

  // ============================================================================
  // EFFECT 3: ЗАГРУЗКА ГЛИФА
  // ============================================================================
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !editingGlyph) {
      if (canvas) {
        FabricTools.clearCanvas(canvas);
      }
      return;
    }

    console.log('📥 [FabricEditor] Loading glyph:', editingGlyph.unicode);

    FabricTools.clearCanvas(canvas);

    if (editingGlyph.path.contours.length > 0) {
      FabricConverter.glyphPathToFabric(editingGlyph.path, canvas);

      setTimeout(() => {
        dispatch(setActiveTool(ToolType.DIRECT_SELECT));
        console.log('✅ [FabricEditor] Direct Select activated for existing glyph');
      }, 150);
    } else {
      dispatch(setActiveTool(ToolType.PEN));
      console.log('✅ [FabricEditor] Pen Tool activated for empty glyph');
    }
  }, [editingGlyph, dispatch]);

  // ============================================================================
  // EFFECT 4: ПЕРЕКЛЮЧЕНИЕ ИНСТРУМЕНТОВ
  // ============================================================================
  useEffect(() => {
    const canvas = fabricCanvasRef.current;

    if (
        !canvas ||
        !penToolRef.current ||
        !directSelectionToolRef.current ||
        !convertAnchorToolRef.current ||
        !rotateToolRef.current ||
        !scaleToolRef.current ||
        !reflectToolRef.current ||
        !addAnchorToolRef.current ||
        !deleteAnchorToolRef.current ||
        !pathfinderToolRef.current ||
        !scissorsToolRef.current ||
        !smoothToolRef.current ||
        !simplifyToolRef.current ||
        !joinToolRef.current ||
        !textToolRef.current
    ) return;

    console.log('✏️ [FabricEditor] Switching to tool:', canvasState.activeTool);

    // Деактивируем ВСЕ инструменты
    penToolRef.current.deactivate();
    directSelectionToolRef.current.deactivate();
    convertAnchorToolRef.current.deactivate();
    rotateToolRef.current.deactivate();
    scaleToolRef.current.deactivate();
    reflectToolRef.current.deactivate();
    addAnchorToolRef.current.deactivate();
    deleteAnchorToolRef.current.deactivate();
    pathfinderToolRef.current.deactivate();
    scissorsToolRef.current.deactivate();
    smoothToolRef.current.deactivate();
    simplifyToolRef.current.deactivate();
    joinToolRef.current.deactivate();
    textToolRef.current.deactivate();
    FabricTools.disableDrawingMode(canvas);

    // Активируем нужный
    switch (canvasState.activeTool) {
      case ToolType.PEN:
        penToolRef.current.activate();
        break;
      case ToolType.DIRECT_SELECT:
        directSelectionToolRef.current.activate();
        break;
      case ToolType.CONVERT_ANCHOR:
        convertAnchorToolRef.current.activate();
        break;
      case ToolType.ADD_ANCHOR:
        addAnchorToolRef.current.activate();
        break;
      case ToolType.DELETE_ANCHOR:
        deleteAnchorToolRef.current.activate();
        break;
      case ToolType.ROTATE:
        rotateToolRef.current.activate();
        break;
      case ToolType.SCALE:
        scaleToolRef.current.activate();
        break;
      case ToolType.REFLECT:
        reflectToolRef.current.activate();
        break;
      case ToolType.PATHFINDER:
        pathfinderToolRef.current.activate();
        break;
      case ToolType.SCISSORS:
        scissorsToolRef.current.activate();
        break;
      case ToolType.SMOOTH:
        smoothToolRef.current.activate();
        break;
      case ToolType.SIMPLIFY:
        simplifyToolRef.current.activate();
        break;
      case ToolType.JOIN:
        joinToolRef.current.activate();
        break;
      case ToolType.TEXT:
        textToolRef.current.activate();
        break;
    }
  }, [canvasState.activeTool]);

  // ============================================================================
  // EFFECT 5: ГОРЯЧИЕ КЛАВИШИ (Mac & Windows)
  // ============================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      // Игнорируем если фокус в input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Определяем Ctrl/Cmd
      const ctrlCmd = isMac() ? e.metaKey : e.ctrlKey;

      // P - PEN TOOL
      if ((e.key === 'p' || e.key === 'P') && !ctrlCmd && !e.shiftKey) {
        console.log('🔑 [Hotkey] P pressed → Pen Tool');
        dispatch(setActiveTool(ToolType.PEN));
        e.preventDefault();
        return;
      }

      // A - DIRECT SELECTION
      if ((e.key === 'a' || e.key === 'A') && !ctrlCmd && !e.shiftKey) {
        console.log('🔑 [Hotkey] A pressed → Direct Selection');
        dispatch(setActiveTool(ToolType.DIRECT_SELECT));
        e.preventDefault();
        return;
      }

      // V - SELECTION TOOL
      if ((e.key === 'v' || e.key === 'V') && !ctrlCmd && !e.shiftKey) {
        console.log('🔑 [Hotkey] V pressed → Selection');
        dispatch(setActiveTool(ToolType.SELECT));
        e.preventDefault();
        return;
      }

      // T - TEXT TOOL
      if ((e.key === 't' || e.key === 'T') && !ctrlCmd && !e.shiftKey) {
        console.log('🔑 [Hotkey] T pressed → Text Tool');
        dispatch(setActiveTool(ToolType.TEXT));
        e.preventDefault();
        return;
      }

      // Shift+C - CONVERT ANCHOR POINT
      if (e.shiftKey && (e.key === 'c' || e.key === 'C') && !ctrlCmd) {
        console.log('🔑 [Hotkey] Shift+C pressed → Convert Anchor');
        dispatch(setActiveTool(ToolType.CONVERT_ANCHOR));
        e.preventDefault();
        return;
      }

      // Delete/Backspace - УДАЛЕНИЕ
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvasState.activeTool !== ToolType.PEN && canvasState.activeTool !== ToolType.TEXT) {
          console.log('🔑 [Hotkey] Delete pressed → Deleting selected');
          FabricTools.deleteSelected(canvas);
          saveCurrentGlyph();
          e.preventDefault();
        }
        return;
      }

      // Ctrl/Cmd + Z - UNDO
      if (ctrlCmd && e.key === 'z') {
        console.log('🔑 [Hotkey] Undo (not implemented yet)');
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd + Shift + Z - REDO
      if (ctrlCmd && e.shiftKey && e.key === 'z') {
        console.log('🔑 [Hotkey] Redo (not implemented yet)');
        e.preventDefault();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, canvasState.activeTool, saveCurrentGlyph, isMac]);

  // ============================================================================
  // HANDLERS: Добавление фигур
  // ============================================================================
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
    if (!activeObject) return;

    if (activeObject.type === 'i-text' || activeObject.type === 'text') {
      console.log('ℹ️ [FabricEditor] Text to path conversion not supported yet');
      return;
    }

    FabricTools.convertToPath(canvas, activeObject);
    saveCurrentGlyph();
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
      <div className={styles.container}>
        <canvas ref={canvasRef} className={styles.canvas} />

        {/* Панель с фигурами */}
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

        {/* Панель свойств */}
        <PropertiesPanel
            canvas={fabricCanvasRef.current}
            onConvertToPath={handleConvertToPath}
            pathfinderTool={pathfinderToolRef.current}
        />

        {/* Информация о текущем инструменте */}
        <div className={styles.info}>
          <span>Tool: {canvasState.activeTool}</span>
          {editingGlyph && <span>Editing: {editingGlyph.unicode}</span>}
        </div>

        {/* Подсказки для каждого инструмента */}
        <div className={styles.hint}>
          {canvasState.activeTool === ToolType.PEN && (
              <span>✏️ Click = point | Click+Drag = curve | Enter = close | Backspace = undo</span>
          )}
          {canvasState.activeTool === ToolType.TEXT && (
              <span>🔤 Click anywhere to add text | Type and edit | Auto-switch to Select when done</span>
          )}
          {canvasState.activeTool === ToolType.DIRECT_SELECT && (
              <span>🎯 Shift+Click = multi-select | Green 🟢 = drag segment | 2 points + Delete = cut segment</span>
          )}
          {canvasState.activeTool === ToolType.CONVERT_ANCHOR && (
              <span>⚡ Click point: 🔵 Smooth ↔ 🟠 Corner</span>
          )}
          {canvasState.activeTool === ToolType.ADD_ANCHOR && (
              <span>➕ Click path | Hover preview | Click to add point</span>
          )}
          {canvasState.activeTool === ToolType.DELETE_ANCHOR && (
              <span>➖ Click path | 🔴 Click to delete | ⚪ Gray = min 3 points</span>
          )}
          {canvasState.activeTool === ToolType.ROTATE && (
              <span>🔄 Click & drag to rotate | Shift = snap 15° | ← → = rotate 15°</span>
          )}
          {canvasState.activeTool === ToolType.SCALE && (
              <span>📏 Click & drag to scale | Shift = uniform | ↑ ↓ = scale 10%</span>
          )}
          {canvasState.activeTool === ToolType.REFLECT && (
              <span>🪞 Click object | H = flip horizontal | V = flip vertical</span>
          )}
          {canvasState.activeTool === ToolType.PATHFINDER && (
              <span>🔗 Select 2+ objects | Use Pathfinder buttons in Properties panel</span>
          )}
          {canvasState.activeTool === ToolType.SCISSORS && (
              <span>✂️ Click path twice to cut | Red markers = cut points | Escape = cancel</span>
          )}
          {canvasState.activeTool === ToolType.SMOOTH && (
              <span>⌇ Click path | 🟠 Click corner to smooth | S = smooth all | +/- = adjust intensity</span>
          )}
          {canvasState.activeTool === ToolType.SIMPLIFY && (
              <span>📉 Click path to simplify | S = simplify selected | A = simplify all | +/- = adjust tolerance</span>
          )}
          {canvasState.activeTool === ToolType.JOIN && (
              <span>🔗 🔴 Red = open ends | Click 2 ends to join | J = join nearest | C = close all paths</span>
          )}
          {canvasState.activeTool === ToolType.SELECT && (
              <span>👆 Select & edit | Shift+Drag = pan | Scroll = zoom | Delete = remove</span>
          )}
        </div>
      </div>
  );
};