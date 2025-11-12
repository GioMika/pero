import type { Glyph } from '@entities/glyph';

export interface GlyphStyle {
  strokeWidth: number;
  height: number;
  width: number;
  aspectRatio: number;
  verticalWeight: number;
  horizontalWeight: number;
}

export class StyleAnalyzer {
  /**
   * Анализирует стиль глифа
   */
  static analyzeGlyph(glyph: Glyph): GlyphStyle {
    if (!glyph.path.contours || glyph.path.contours.length === 0) {
      return this.getDefaultStyle();
    }

    const bounds = this.calculateBounds(glyph);
    const strokeWidth = this.estimateStrokeWidth(glyph);

    return {
      strokeWidth,
      height: bounds.height,
      width: bounds.width,
      aspectRatio: bounds.width / bounds.height,
      verticalWeight: strokeWidth / bounds.height,
      horizontalWeight: strokeWidth / bounds.width,
    };
  }

  private static calculateBounds(glyph: Glyph) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    glyph.path.contours.forEach((contour) => {
      contour.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private static estimateStrokeWidth(glyph: Glyph): number {
    // Простая оценка толщины линии на основе первого контура
    if (glyph.path.contours.length === 0) return 50;

    const firstContour = glyph.path.contours[0];
    if (firstContour.points.length < 2) return 50;

    // Берем среднее расстояние между соседними точками
    let totalDistance = 0;
    let count = 0;

    for (let i = 0; i < firstContour.points.length - 1; i++) {
      const p1 = firstContour.points[i];
      const p2 = firstContour.points[i + 1];
      const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      totalDistance += distance;
      count++;
    }

    return count > 0 ? totalDistance / count / 2 : 50;
  }

  private static getDefaultStyle(): GlyphStyle {
    return {
      strokeWidth: 50,
      height: 600,
      width: 400,
      aspectRatio: 0.67,
      verticalWeight: 0.083,
      horizontalWeight: 0.125,
    };
  }
}