import type { FC } from 'react';
import { useState, useEffect } from 'react';
import * as fabric from 'fabric';
import styles from './PropertiesPanel.module.scss';

interface PropertiesPanelProps {
  canvas: fabric.Canvas | null;
  onConvertToPath: () => void;
}

export const PropertiesPanel: FC<PropertiesPanelProps> = ({ canvas, onConvertToPath }) => {
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
      selectedObject.set('fill', color);
      canvas.renderAll();
    }
  };

  const handleStrokeChange = (color: string) => {
    if (canvas && selectedObject) {
      setStrokeColor(color);
      selectedObject.set('stroke', color);
      canvas.renderAll();
    }
  };

  const handleStrokeWidthChange = (width: number) => {
    if (canvas && selectedObject) {
      setStrokeWidth(width);
      selectedObject.set('strokeWidth', width);
      canvas.renderAll();
    }
  };

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

        {selectedObject.type !== 'path' && (
            <div className={styles.section}>
              <button onClick={onConvertToPath} className={styles.convertBtn}>
                🔧 Convert to Path (Edit Points)
              </button>
            </div>
        )}

        {selectedObject.type === 'path' && (
            <div className={styles.section}>
              <div className={styles.pathInfo}>
                ✅ Path mode - You can edit points directly
              </div>
            </div>
        )}
      </div>
  );
};