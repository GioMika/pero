export interface Point {
  x: number;
  y: number;
  onCurve: boolean; // true = на кривой, false = контрольная точка
}

export interface Contour {
  points: Point[];
  closed: boolean;
}

export interface GlyphPath {
  contours: Contour[];
}

export interface GlyphMetrics {
  width: number;
  height: number;
  leftSideBearing: number;
  rightSideBearing: number;
  advanceWidth: number;
}

export interface Glyph {
  id: string;
  unicode: string; // Unicode символ (например, 'A', 'а', 'ა')
  name: string; // Имя глифа (например, 'A', 'a-cy', 'ani-georgian')
  path: GlyphPath;
  metrics: GlyphMetrics;
  isModified: boolean; // Изменен ли глиф вручную
  isInterpolated: boolean; // Создан ли автоматически
  baseGlyphId?: string; // ID базового глифа для интерполяции
}

export interface GlyphState {
  glyphs: Record<string, Glyph>; // glyphId -> Glyph
  selectedGlyphId: string | null;
  editingGlyphId: string | null;
  copiedGlyph: Glyph | null;
}