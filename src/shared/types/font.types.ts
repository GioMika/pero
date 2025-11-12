export interface FontMetrics {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
  capHeight: number;
  xHeight: number;
}

export interface FontMetadata {
  familyName: string;
  styleName: string;
  version: string;
  designer?: string;
  description?: string;
  license?: string;
}

export interface Font {
  id: string;
  metadata: FontMetadata;
  metrics: FontMetrics;
  glyphs: Map<string, string>; // unicode -> glyphId
  createdAt: number;
  updatedAt: number;
}

export interface FontState {
  currentFont: Font | null;
  isLoading: boolean;
  error: string | null;
}