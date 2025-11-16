import type { FC } from 'react';
import { useAppDispatch, useAppSelector } from '@shared/lib/hooks';
import { setActiveTool, zoomIn, zoomOut, resetZoom, toggleGrid, toggleGuidelines } from '@widgets/editor-canvas';
import { ToolType } from '@shared/types';
import { Button } from '@shared/ui';
import styles from './Toolbar.module.scss';

export const Toolbar: FC = () => {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector((state) => state.canvas.activeTool);
  const showGrid = useAppSelector((state) => state.canvas.config.showGrid);
  const showGuidelines = useAppSelector((state) => state.canvas.config.showGuidelines);

  return (
      <div className={styles.toolbar}>
        <div className={styles.section}>
          <h3 className={styles.title}>Tools</h3>
          <div className={styles.tools}>
            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.SELECT}
                onClick={() => dispatch(setActiveTool(ToolType.SELECT))}
            >
              ↖️ Select
            </Button>
            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.DIRECT_SELECT}
                onClick={() => dispatch(setActiveTool(ToolType.DIRECT_SELECT))}
            >
              🎯 Direct Select
            </Button>
            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.PEN}
                onClick={() => dispatch(setActiveTool(ToolType.PEN))}
            >
              ✏️ Pen
            </Button>
            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.TEXT}
                onClick={() => dispatch(setActiveTool(ToolType.TEXT))}
            >
              🔤 Text
            </Button>
            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.MOVE}
                onClick={() => dispatch(setActiveTool(ToolType.MOVE))}
            >
              ✋ Move
            </Button>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.title}>View</h3>
          <div className={styles.tools}>
            <Button size="sm" variant="ghost" onClick={() => dispatch(zoomIn())}>
              🔍 Zoom In
            </Button>
            <Button size="sm" variant="ghost" onClick={() => dispatch(zoomOut())}>
              🔍 Zoom Out
            </Button>
            <Button size="sm" variant="ghost" onClick={() => dispatch(resetZoom())}>
              🎯 Reset
            </Button>

            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.CONVERT_ANCHOR}
                onClick={() => dispatch(setActiveTool(ToolType.CONVERT_ANCHOR))}
            >
              ⚡ Convert Point
            </Button>

            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.SMOOTH}
                onClick={() => dispatch(setActiveTool(ToolType.SMOOTH))}
            >
              ⌇ Smooth
            </Button>

            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.SIMPLIFY}
                onClick={() => dispatch(setActiveTool(ToolType.SIMPLIFY))}
            >
              📉 Simplify
            </Button>

            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.JOIN}
                onClick={() => dispatch(setActiveTool(ToolType.JOIN))}
            >
              🔗 Join
            </Button>

            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.ROTATE}
                onClick={() => dispatch(setActiveTool(ToolType.ROTATE))}
            >
              🔄 Rotate
            </Button>

            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.SCALE}
                onClick={() => dispatch(setActiveTool(ToolType.SCALE))}
            >
              📏 Scale
            </Button>

            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.REFLECT}
                onClick={() => dispatch(setActiveTool(ToolType.REFLECT))}
            >
              🪞 Reflect
            </Button>

            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.ADD_ANCHOR}
                onClick={() => dispatch(setActiveTool(ToolType.ADD_ANCHOR))}
            >
              ➕ Add Point
            </Button>

            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.DELETE_ANCHOR}
                onClick={() => dispatch(setActiveTool(ToolType.DELETE_ANCHOR))}
            >
              ➖ Delete Point
            </Button>

            <Button
                size="sm"
                variant="ghost"
                active={activeTool === ToolType.SCISSORS}
                onClick={() => dispatch(setActiveTool(ToolType.SCISSORS))}
            >
              ✂️ Scissors
            </Button>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.title}>Display</h3>
          <div className={styles.tools}>
            <Button
                size="sm"
                variant="ghost"
                active={showGrid}
                onClick={() => dispatch(toggleGrid())}
            >
              # Grid
            </Button>
            <Button
                size="sm"
                variant="ghost"
                active={showGuidelines}
                onClick={() => dispatch(toggleGuidelines())}
            >
              ➕ Guides
            </Button>
          </div>
        </div>
      </div>
  );
};