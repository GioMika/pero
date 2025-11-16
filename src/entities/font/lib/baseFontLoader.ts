import { BASE_FONT_GLYPHS } from '@shared/lib/constants';
import { GlyphEngine } from '@entities/glyph';
import type { Glyph } from '@shared/types';

/**
 * Загрузить базовый шрифт со всеми глифами
 */
export function loadBaseFont(): Record<string, Glyph> {
  const glyphs: Record<string, Glyph> = {};

  BASE_FONT_GLYPHS.forEach(glyphData => {
    if (!glyphData.svg) {
      // Пустой глиф (например пробел)
      const glyph = GlyphEngine.createEmptyGlyph(glyphData.unicode, glyphData.name);
      glyph.metrics.advanceWidth = glyphData.width;
      glyphs[glyph.id] = glyph;
      return;
    }

    // Парсим SVG path в контуры
    const path = GlyphEngine.parseSVGPath(glyphData.svg);
    
    const glyph: Glyph = {
      id: `glyph-${glyphData.unicode}`,
      unicode: glyphData.unicode,
      name: glyphData.name,
      path,
      metrics: {
        width: glyphData.width,
        height: 700,
        leftSideBearing: 0,
        rightSideBearing: 0,
        advanceWidth: glyphData.width,
      },
      isModified: false,
      isInterpolated: false,
    };

    glyphs[glyph.id] = glyph;
  });

  console.log('✅ [loadBaseFont] Loaded', Object.keys(glyphs).length, 'glyphs');
  return glyphs;
}
