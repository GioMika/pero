import { GlyphEngine } from '@entities/glyph';
import type { Glyph } from '@entities/glyph';
import { StyleAnalyzer, type GlyphStyle } from './styleAnalyzer';

export class InterpolationEngine {
  /**
   * Создает глифы для всех символов на основе стиля базового глифа
   */
  static interpolateFont(baseGlyph: Glyph, targetChars: string[]): Glyph[] {
    const style = StyleAnalyzer.analyzeGlyph(baseGlyph);
    const interpolatedGlyphs: Glyph[] = [];

    targetChars.forEach((char) => {
      if (char === baseGlyph.unicode) {
        // Пропускаем базовый глиф
        return;
      }

      const newGlyph = this.createGlyphFromStyle(char, style);
      interpolatedGlyphs.push(newGlyph);
    });

    return interpolatedGlyphs;
  }

  /**
   * Создает глиф на основе стиля
   */
  private static createGlyphFromStyle(unicode: string, style: GlyphStyle): Glyph {
    const glyph = GlyphEngine.createEmptyGlyph(unicode);

    // Создаем базовую форму в зависимости от типа символа
    const path = this.generatePathForCharacter(unicode, style);

    glyph.path = path;
    glyph.isInterpolated = true;
    glyph.metrics.width = style.width;
    glyph.metrics.height = style.height;
    glyph.metrics.advanceWidth = style.width + 100;

    return glyph;
  }

  /**
   * Генерирует путь для конкретного символа
   */
  private static generatePathForCharacter(unicode: string, style: GlyphStyle) {
    const baseWidth = style.width;
    const baseHeight = style.height;
    const strokeWidth = style.strokeWidth;

    // Определяем тип символа
    if (this.isLatinLetter(unicode)) {
      return this.generateLatinLetter(unicode, baseWidth, baseHeight, strokeWidth);
    } else if (this.isCyrillicLetter(unicode)) {
      return this.generateCyrillicLetter(unicode, baseWidth, baseHeight, strokeWidth);
    } else if (this.isGeorgianLetter(unicode)) {
      return this.generateGeorgianLetter(baseWidth, baseHeight);
    } else if (this.isNumber(unicode)) {
      return this.generateNumber(unicode, baseWidth, baseHeight, strokeWidth);
    }

    // Дефолтный прямоугольник
    return this.generateRectangle(baseWidth, baseHeight);
  }

  private static isLatinLetter(char: string): boolean {
    return /[A-Za-z]/.test(char);
  }

  private static isCyrillicLetter(char: string): boolean {
    return /[А-Яа-яЁё]/.test(char);
  }

  private static isGeorgianLetter(char: string): boolean {
    return /[\u10A0-\u10FF]/.test(char);
  }

  private static isNumber(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private static generateLatinLetter(char: string, width: number, height: number, stroke: number) {
    const centerX = width / 2 + 100;
    const baseline = 0;
    const ascender = -height;

    // Простые формы для латиницы
    switch (char.toUpperCase()) {
      case 'A':
        return {
          contours: [
            {
              points: [
                { x: centerX - width / 2, y: baseline, onCurve: true },
                { x: centerX, y: ascender, onCurve: true },
                { x: centerX + width / 2, y: baseline, onCurve: true },
                { x: centerX + width / 4, y: baseline - height / 3, onCurve: true },
                { x: centerX - width / 4, y: baseline - height / 3, onCurve: true },
              ],
              closed: true,
            },
          ],
        };

      case 'O':
        return this.generateCircle(centerX, ascender / 2, width / 2, height / 2);

      case 'I':
        return {
          contours: [
            {
              points: [
                { x: centerX - stroke / 2, y: baseline, onCurve: true },
                { x: centerX + stroke / 2, y: baseline, onCurve: true },
                { x: centerX + stroke / 2, y: ascender, onCurve: true },
                { x: centerX - stroke / 2, y: ascender, onCurve: true },
              ],
              closed: true,
            },
          ],
        };

      default:
        return this.generateRectangle(width, height);
    }
  }

  private static generateCyrillicLetter(char: string, width: number, height: number, stroke: number) {
    // Для кириллицы используем похожие формы
    return this.generateLatinLetter(char, width, height, stroke);
  }

  private static generateGeorgianLetter(width: number, height: number) {
    const centerX = width / 2 + 100;
    const ascender = -height;

    // Упрощенные грузинские формы (округлые)
    return this.generateCircle(centerX, ascender / 2, width / 2, height / 2);
  }

  private static generateNumber(char: string, width: number, height: number, stroke: number) {
    const centerX = width / 2 + 100;
    const baseline = 0;
    const ascender = -height;

    switch (char) {
      case '0':
        return this.generateCircle(centerX, ascender / 2, width / 2, height / 2);

      case '1':
        return {
          contours: [
            {
              points: [
                { x: centerX - stroke / 2, y: baseline, onCurve: true },
                { x: centerX + stroke / 2, y: baseline, onCurve: true },
                { x: centerX + stroke / 2, y: ascender, onCurve: true },
                { x: centerX - stroke / 2, y: ascender, onCurve: true },
              ],
              closed: true,
            },
          ],
        };

      default:
        return this.generateRectangle(width, height);
    }
  }

  private static generateCircle(cx: number, cy: number, rx: number, ry: number) {
    // Аппроксимация круга точками
    const points = [];
    const segments = 12;

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push({
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
        onCurve: true,
      });
    }

    return { contours: [{ points, closed: true }] };
  }

  private static generateRectangle(width: number, height: number) {
    return {
      contours: [
        {
          points: [
            { x: 100, y: 0, onCurve: true },
            { x: 100 + width, y: 0, onCurve: true },
            { x: 100 + width, y: -height, onCurve: true },
            { x: 100, y: -height, onCurve: true },
          ],
          closed: true,
        },
      ],
    };
  }
}