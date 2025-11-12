export interface Point {
  x: number;
  y: number;
  onCurve: boolean;
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
  unicode: string;
  name: string;
  path: GlyphPath;
  metrics: GlyphMetrics;
  isModified: boolean;
  isInterpolated: boolean;
}

export interface GlyphState {
  glyphs: Record<string, Glyph>; // glyphId -> Glyph
  selectedGlyphId: string | null;
  editingGlyphId: string | null;
}