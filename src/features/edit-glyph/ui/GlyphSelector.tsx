import type { FC } from 'react';
import { useAppDispatch, useAppSelector } from '@shared/lib/hooks';
import { addGlyph, setEditingGlyph, selectAllGlyphs } from '@entities/glyph';
import { GlyphEngine } from '@entities/glyph';
import { GLYPH_CATEGORIES } from '@shared/lib/constants';
import { Button } from '@shared/ui';
import styles from './GlyphSelector.module.scss';

export const GlyphSelector: FC = () => {
  const dispatch = useAppDispatch();
  const allGlyphs = useAppSelector(selectAllGlyphs);
  const editingGlyphId = useAppSelector((state) => state.glyph.editingGlyphId);

  const handleCreateGlyph = (unicode: string) => {
    // Проверяем, есть ли уже глиф с таким unicode
    const existingGlyph = Object.values(allGlyphs).find((g) => g.unicode === unicode);

    if (existingGlyph) {
      // Если есть, просто выбираем его для редактирования
      dispatch(setEditingGlyph(existingGlyph.id));
    } else {
      // Создаем новый пустой глиф
      const newGlyph = GlyphEngine.createEmptyGlyph(unicode, `glyph-${unicode}`);
      dispatch(addGlyph(newGlyph));
      dispatch(setEditingGlyph(newGlyph.id));
    }
  };

  const handleClearGlyph = () => {
    dispatch(setEditingGlyph(null));
  };

  return (
      <div className={styles.selector}>
        <div className={styles.header}>
          <h3 className={styles.title}>Glyphs</h3>
          <Button size="sm" variant="ghost" onClick={handleClearGlyph}>
            ✕ Clear
          </Button>
        </div>

        <div className={styles.content}>
          {Object.entries(GLYPH_CATEGORIES).map(([key, category]) => (
              <div key={key} className={styles.category}>
                <h4 className={styles.categoryTitle}>{category.name}</h4>
                <div className={styles.glyphs}>
                  {category.chars.split('').map((char) => {
                    const existingGlyph = Object.values(allGlyphs).find((g) => g.unicode === char);
                    const isEditing = existingGlyph?.id === editingGlyphId;
                    const hasContent = existingGlyph && existingGlyph.path.contours.length > 0;

                    return (
                        <button
                            key={char}
                            className={`${styles.glyph} ${isEditing ? styles.active : ''} ${
                                hasContent ? styles.filled : ''
                            }`}
                            onClick={() => handleCreateGlyph(char)}
                            title={`${char} (${char.charCodeAt(0)})`}
                        >
                          {char}
                          {hasContent && <span className={styles.indicator}>●</span>}
                        </button>
                    );
                  })}
                </div>
              </div>
          ))}
        </div>
      </div>
  );
};