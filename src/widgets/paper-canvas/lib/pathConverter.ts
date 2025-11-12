import paper from 'paper';
import type { GlyphPath, Point as GlyphPoint, Contour } from '@shared/types';

export class PathConverter {
  /**
   * Конвертирует Paper.js Path в наш GlyphPath
   */
  static paperToGlyphPath(paperPath: paper.Path): GlyphPath {
    const contours: Contour[] = [];

    if (paperPath.segments.length === 0) {
      return { contours };
    }

    const points: GlyphPoint[] = [];

    paperPath.segments.forEach((segment) => {
      // Добавляем основную точку
      points.push({
        x: Math.round(segment.point.x),
        y: Math.round(segment.point.y),
        onCurve: true,
      });

      // Если есть handleOut, добавляем контрольную точку
      if (segment.handleOut && !segment.handleOut.isZero()) {
        points.push({
          x: Math.round(segment.point.x + segment.handleOut.x),
          y: Math.round(segment.point.y + segment.handleOut.y),
          onCurve: false,
        });
      }
    });

    contours.push({
      points,
      closed: paperPath.closed,
    });

    return { contours };
  }

  /**
   * Конвертирует наш GlyphPath в Paper.js Path
   */
  static glyphToPaperPath(glyphPath: GlyphPath): paper.Path {
    const path = new paper.Path({
      strokeColor: new paper.Color('#ffffff'),
      strokeWidth: 2,
      fillColor: null,
    });

    if (glyphPath.contours.length === 0) {
      return path;
    }

    // Берем первый контур
    const contour = glyphPath.contours[0];

    contour.points.forEach((point) => {
      if (point.onCurve) {
        path.add(new paper.Point(point.x, point.y));
      }
    });

    path.closed = contour.closed;

    return path;
  }

  /**
   * Создает Bezier путь из точек
   */
  static createSmoothPath(points: GlyphPoint[]): paper.Path {
    const path = new paper.Path({
      strokeColor: new paper.Color('#00aaff'),
      strokeWidth: 2,
      fillColor: null,
    });

    points.forEach((point) => {
      path.add(new paper.Point(point.x, point.y));
    });

    // Сглаживаем путь
    path.smooth({ type: 'continuous' });

    return path;
  }
}