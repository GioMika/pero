import type { Glyph, GlyphPath } from '../model/types';

export class GlyphEngine {
  /**
   * Создает пустой глиф
   */
  static createEmptyGlyph(unicode: string, name?: string): Glyph {
    return {
      id: `glyph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      unicode,
      name: name || `glyph-${unicode}`,
      path: { contours: [] },
      metrics: {
        width: 500,
        height: 700,
        leftSideBearing: 50,
        rightSideBearing: 50,
        advanceWidth: 600,
      },
      isModified: false,
      isInterpolated: false,
    };
  }

  /**
   * Создает простой прямоугольный глиф (для тестов)
   */
  static createRectangleGlyph(
      unicode: string,
      width: number = 400,
      height: number = 600
  ): Glyph {
    const glyph = this.createEmptyGlyph(unicode);

    glyph.path = {
      contours: [
        {
          points: [
            { x: 50, y: 0, onCurve: true },
            { x: 50 + width, y: 0, onCurve: true },
            { x: 50 + width, y: height, onCurve: true },
            { x: 50, y: height, onCurve: true },
          ],
          closed: true,
        },
      ],
    };

    glyph.metrics.width = width;
    glyph.metrics.height = height;
    glyph.metrics.advanceWidth = width + 100;

    return glyph;
  }

  /**
   * Клонирование глифа
   */
  static cloneGlyph(source: Glyph, newUnicode: string): Glyph {
    return {
      ...source,
      id: `glyph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      unicode: newUnicode,
      name: `glyph-${newUnicode}`,
      isModified: false,
      isInterpolated: false,
    };
  }

  /**
   * Проверка валидности пути глифа
   */
  static isValidPath(path: GlyphPath): boolean {
    return path.contours.every(
        (contour) => contour.points.length >= 3 // Минимум 3 точки для контура
    );
  }
}