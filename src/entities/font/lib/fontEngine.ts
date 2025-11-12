import type { Font } from '../model/types';

export class FontEngine {
  /**
   * Создает новый пустой шрифт
   */
  static createEmptyFont(familyName: string, styleName: string = 'Regular'): Font {
    return {
      id: `font-${Date.now()}`,
      metadata: {
        familyName,
        styleName,
        version: '1.0.0',
      },
      metrics: {
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        lineGap: 0,
        capHeight: 700,
        xHeight: 500,
      },
      glyphIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Валидация метрик шрифта
   */
  static validateMetrics(unitsPerEm: number, ascender: number, descender: number): boolean {
    return (
        unitsPerEm > 0 &&
        ascender > 0 &&
        descender < 0 &&
        Math.abs(ascender + descender) <= unitsPerEm
    );
  }

  /**
   * Расчет высоты линии
   */
  static calculateLineHeight(ascender: number, descender: number, lineGap: number): number {
    return ascender - descender + lineGap;
  }
}