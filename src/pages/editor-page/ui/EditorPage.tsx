import type { FC } from 'react';
import { Toolbar } from '@widgets/toolbar';
import { FabricEditor } from '@widgets/fabric-editor';
import { GlyphSelector } from '@features/edit-glyph';
import styles from './EditorPage.module.scss';

export const EditorPage: FC = () => {
  return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>🎨 Font Editor Pro</h1>
          <div className={styles.actions}>
            <span className={styles.version}>v2.0.0 - Fabric.js</span>
          </div>
        </header>
        <div className={styles.content}>
          <Toolbar />
          <FabricEditor />
          <GlyphSelector />
        </div>
      </div>
  );
};