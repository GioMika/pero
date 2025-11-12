import type { FC } from 'react';
import { useState, useEffect } from 'react';
import * as fabric from 'fabric';
import { PathfinderTool, PathfinderOperation } from '../lib/pathfinderTool';
import styles from './PropertiesPanel.module.scss';

interface PropertiesPanelProps {
  canvas: fabric.Canvas | null;
  onConvertToPath: () => void;
  pathfinderTool?: PathfinderTool | null;
}

export const PropertiesPanel: FC<PropertiesPanelProps> = ({
                                                            canvas,
                                                            onConvertToPath,
                                                            pathfinderTool
                                                          }) => {
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [fillColor, setFillColor] = useState('#00aaff');
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(2);

  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const active = canvas.getActiveObject();
      setSelectedObject(active || null);

      if (active) {
        setFillColor((active.fill as string) || 'transparent');
        setStrokeColor((active.stroke as string) || '#ffffff');
        setStrokeWidth((active.strokeWidth as number) || 2);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedObject(null));

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared');
    };
  }, [canvas]);

  const handleFillChange = (color: string) => {
    if (canvas && selectedObject) {
      setFillColor(color);

      if (selectedObject.type?.toLowerCase() === 'activeselection') {
        const objects = (selectedObject as any)._objects || [];
        objects.forEach((obj: fabric.Object) => {
          obj.set('fill', color);
        });
      } else {
        selectedObject.set('fill', color);
      }

      canvas.renderAll();
    }
  };

  const handleStrokeChange = (color: string) => {
    if (canvas && selectedObject) {
      setStrokeColor(color);

      if (selectedObject.type?.toLowerCase() === 'activeselection') {
        const objects = (selectedObject as any)._objects || [];
        objects.forEach((obj: fabric.Object) => {
          obj.set('stroke', color);
        });
      } else {
        selectedObject.set('stroke', color);
      }

      canvas.renderAll();
    }
  };

  const handleStrokeWidthChange = (width: number) => {
    if (canvas && selectedObject) {
      setStrokeWidth(width);

      if (selectedObject.type?.toLowerCase() === 'activeselection') {
        const objects = (selectedObject as any)._objects || [];
        objects.forEach((obj: fabric.Object) => {
          obj.set('strokeWidth', width);
        });
      } else {
        selectedObject.set('strokeWidth', width);
      }

      canvas.renderAll();
    }
  };

  const handlePathfinderOperation = (operation: PathfinderOperation) => {
    if (!pathfinderTool) {
      alert('Pathfinder tool not available! Please refresh the page.');
      return;
    }
    pathfinderTool.executeOperation(operation);
  };

  // ИСПРАВЛЕНО: проверка типа через toLowerCase()
  const selectedType = selectedObject?.type?.toLowerCase() || '';
  const isMultipleSelection = selectedType === 'activeselection';
  const objectsCount = isMultipleSelection ? ((selectedObject as any)._objects?.length || 0) : 1;
  const showPathfinder = isMultipleSelection && objectsCount >= 2;

  if (!selectedObject) {
    return (
        <div className={styles.panel}>
          <div className={styles.noSelection}>
            Select an object to edit properties
          </div>
        </div>
    );
  }

  return (
      <div className={styles.panel}>
        {/* Pathfinder - показываем если 2+ объекта */}
        {showPathfinder && (
            <div className={styles.section}>
              <h3>🔗 Pathfinder ({objectsCount} objects)</h3>
              <div className={styles.pathfinderButtons}>
                <button
                    onClick={() => handlePathfinderOperation(PathfinderOperation.UNITE)}
                    className={styles.pathfinderBtn}
                    title="Unite - Combine all shapes into one"
                >
                  ⊕ Unite
                </button>
                <button
                    onClick={() => handlePathfinderOperation(PathfinderOperation.SUBTRACT)}
                    className={styles.pathfinderBtn}
                    title="Subtract - Remove top shape from bottom"
                >
                  ⊖ Subtract
                </button>
                <button
                    onClick={() => handlePathfinderOperation(PathfinderOperation.INTERSECT)}
                    className={styles.pathfinderBtn}
                    title="Intersect - Keep only overlapping area"
                >
                  ⊗ Intersect
                </button>
                <button
                    onClick={() => handlePathfinderOperation(PathfinderOperation.EXCLUDE)}
                    className={styles.pathfinderBtn}
                    title="Exclude - Remove overlapping area"
                >
                  ⊘ Exclude
                </button>
              </div>
            </div>
        )}

        {/* Fill Color */}
        <div className={styles.section}>
          <h3>Fill Color</h3>
          <div className={styles.colorControl}>
            <input
                type="color"
                value={fillColor === 'transparent' ? '#00aaff' : fillColor}
                onChange={(e) => handleFillChange(e.target.value)}
                className={styles.colorPicker}
            />
            <button
                onClick={() => handleFillChange('transparent')}
                className={styles.transparentBtn}
            >
              None
            </button>
          </div>
        </div>

        {/* Stroke Color */}
        <div className={styles.section}>
          <h3>Stroke Color</h3>
          <div className={styles.colorControl}>
            <input
                type="color"
                value={strokeColor}
                onChange={(e) => handleStrokeChange(e.target.value)}
                className={styles.colorPicker}
            />
          </div>
        </div>

        {/* Stroke Width */}
        <div className={styles.section}>
          <h3>Stroke Width</h3>
          <input
              type="range"
              min="0"
              max="20"
              value={strokeWidth}
              onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
              className={styles.slider}
          />
          <span className={styles.value}>{strokeWidth}px</span>
        </div>

        {/* Convert to Path - только для одного объекта */}
        {!isMultipleSelection && selectedObject.type !== 'path' && (
            <div className={styles.section}>
              <button onClick={onConvertToPath} className={styles.convertBtn}>
                🔧 Convert to Path
              </button>
            </div>
        )}

        {/* Path Info - только для одного path */}
        {!isMultipleSelection && selectedObject.type === 'path' && (
            <div className={styles.section}>
              <div className={styles.pathInfo}>
                ✅ Path mode - Edit points available
              </div>
            </div>
        )}

        {/* Multiple Selection Info */}
        {isMultipleSelection && (
            <div className={styles.section}>
              <div className={styles.multiInfo}>
                📦 {objectsCount} objects selected
              </div>
            </div>
        )}
      </div>
  );
};