import type { Point, Contour, GlyphPath } from '../model/types';

export class PathUtils {
  /**
   * Расчет bounding box для контура
   */
  static getContourBounds(contour: Contour): { minX: number; minY: number; maxX: number; maxY: number } {
    if (contour.points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    contour.points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    return { minX, minY, maxX, maxY };
  }

  /**
   * Расчет bounding box для всего пути
   */
  static getPathBounds(path: GlyphPath): { minX: number; minY: number; maxX: number; maxY: number } {
    if (path.contours.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    path.contours.forEach((contour) => {
      const bounds = this.getContourBounds(contour);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    });

    return { minX, minY, maxX, maxY };
  }

  /**
   * Масштабирование пути
   */
  static scalePath(path: GlyphPath, scaleX: number, scaleY: number): GlyphPath {
    return {
      contours: path.contours.map((contour) => ({
        ...contour,
        points: contour.points.map((point) => ({
          ...point,
          x: point.x * scaleX,
          y: point.y * scaleY,
        })),
      })),
    };
  }

  /**
   * Смещение пути
   */
  static translatePath(path: GlyphPath, dx: number, dy: number): GlyphPath {
    return {
      contours: path.contours.map((contour) => ({
        ...contour,
        points: contour.points.map((point) => ({
          ...point,
          x: point.x + dx,
          y: point.y + dy,
        })),
      })),
    };
  }

  /**
   * Расстояние между двумя точками
   */
  static distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
}