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

  /**
   * Парсинг SVG path в GlyphPath
   */
  static parseSVGPath(svgPathString: string): GlyphPath {
    const contours: GlyphPath['contours'] = [];
    
    // Разбиваем path на команды
    const commands = svgPathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
    
    let currentContour: any = null;
    let currentX = 0;
    let currentY = 0;
    
    commands.forEach(cmd => {
      const type = cmd[0].toUpperCase();
      const values = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      
      switch (type) {
        case 'M': // MoveTo
          if (currentContour && currentContour.points.length > 0) {
            contours.push(currentContour);
          }
          currentContour = { points: [], closed: false };
          currentX = values[0];
          currentY = values[1];
          currentContour.points.push({ x: currentX, y: currentY, onCurve: true });
          break;
          
        case 'L': // LineTo
          for (let i = 0; i < values.length; i += 2) {
            currentX = values[i];
            currentY = values[i + 1];
            currentContour?.points.push({ x: currentX, y: currentY, onCurve: true });
          }
          break;
          
        case 'Q': // Quadratic Bezier
          for (let i = 0; i < values.length; i += 4) {
            const cp1x = values[i];
            const cp1y = values[i + 1];
            currentX = values[i + 2];
            currentY = values[i + 3];
            currentContour?.points.push({ x: cp1x, y: cp1y, onCurve: false });
            currentContour?.points.push({ x: currentX, y: currentY, onCurve: true });
          }
          break;
          
        case 'Z': // ClosePath
          if (currentContour) {
            currentContour.closed = true;
          }
          break;
      }
    });
    
    if (currentContour && currentContour.points.length > 0) {
      contours.push(currentContour);
    }
    
    return { contours };
  }
}