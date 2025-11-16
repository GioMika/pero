import * as fabric from 'fabric';
import type { GlyphPath, Contour, Point as GlyphPoint } from '@shared/types';

export class FabricConverter {
  /**
   * Конвертирует Fabric canvas в GlyphPath
   */
  static fabricToGlyphPath(canvas: fabric.Canvas): GlyphPath {
    const contours: Contour[] = [];
    const objects = canvas.getObjects();

    objects.forEach((obj: any) => {
      if (!obj.selectable) return;

      if (obj.type === 'path') {
        const points = this.pathToPoints(obj);
        if (points.length > 0) {
          contours.push({ points, closed: true });
        }
      } else if (obj.type === 'circle') {
        const points = this.circleToPoints(obj);
        contours.push({ points, closed: true });
      } else if (obj.type === 'rect') {
        const points = this.rectToPoints(obj);
        contours.push({ points, closed: true });
      } else if (obj.type === 'triangle') {
        const points = this.triangleToPoints(obj);
        contours.push({ points, closed: true });
      }
    });

    return { contours };
  }

  private static pathToPoints(path: any): GlyphPoint[] {
    const points: GlyphPoint[] = [];
    if (!path.path) return points;

    path.path.forEach((cmd: any) => {
      if (cmd[0] === 'M' || cmd[0] === 'L') {
        points.push({
          x: Math.round(cmd[1]),
          y: Math.round(cmd[2]),
          onCurve: true,
        });
      } else if (cmd[0] === 'Q' || cmd[0] === 'C') {
        const lastIdx = cmd.length - 2;
        points.push({
          x: Math.round(cmd[lastIdx]),
          y: Math.round(cmd[lastIdx + 1]),
          onCurve: true,
        });
      }
    });

    return points;
  }

  private static circleToPoints(circle: any): GlyphPoint[] {
    const points: GlyphPoint[] = [];
    const segments = 12;
    const radius = circle.radius || 50;
    const cx = (circle.left || 0) + radius;
    const cy = (circle.top || 0) + radius;

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push({
        x: Math.round(cx + Math.cos(angle) * radius),
        y: Math.round(cy + Math.sin(angle) * radius),
        onCurve: true,
      });
    }

    return points;
  }

  private static rectToPoints(rect: any): GlyphPoint[] {
    const x = rect.left || 0;
    const y = rect.top || 0;
    const w = rect.width || 100;
    const h = rect.height || 100;

    return [
      { x: Math.round(x), y: Math.round(y), onCurve: true },
      { x: Math.round(x + w), y: Math.round(y), onCurve: true },
      { x: Math.round(x + w), y: Math.round(y + h), onCurve: true },
      { x: Math.round(x), y: Math.round(y + h), onCurve: true },
    ];
  }

  private static triangleToPoints(triangle: any): GlyphPoint[] {
    const x = triangle.left || 0;
    const y = triangle.top || 0;
    const w = triangle.width || 100;
    const h = triangle.height || 100;

    return [
      { x: Math.round(x + w / 2), y: Math.round(y), onCurve: true },
      { x: Math.round(x + w), y: Math.round(y + h), onCurve: true },
      { x: Math.round(x), y: Math.round(y + h), onCurve: true },
    ];
  }

  /**
   * Загружает GlyphPath в Fabric canvas как РЕДАКТИРУЕМЫЙ PATH
   */
  static glyphPathToFabric(glyphPath: GlyphPath, canvas: fabric.Canvas) {
    FabricConverter.clearCanvas(canvas);

    glyphPath.contours.forEach((contour) => {
      if (contour.points.length < 2) return;

      let pathData = `M ${contour.points[0].x} ${contour.points[0].y}`;

      for (let i = 1; i < contour.points.length; i++) {
        const point = contour.points[i];
        pathData += ` L ${point.x} ${point.y}`;
      }

      if (contour.closed) {
        pathData += ' Z';
      }

      const path = new fabric.Path(pathData, {
        fill: 'transparent',
        stroke: '#3B82F6',         // Современный синий
        strokeWidth: 2,
        objectCaching: false,
        hasBorders: true,
        hasControls: true,
        selectable: true,
        evented: true,
        perPixelTargetFind: true,  // Точный клик по пути
      });

      canvas.add(path);

      console.log('✅ [FabricConverter] Contour loaded:', contour.points.length, 'points');
    });

    canvas.renderAll();
    console.log('✅ [FabricConverter] All contours rendered');
  }

  private static clearCanvas(canvas: fabric.Canvas) {
    const objects = canvas.getObjects();
    const toRemove = objects.filter((obj) => obj.selectable !== false);
    toRemove.forEach((obj) => canvas.remove(obj));
  }
}