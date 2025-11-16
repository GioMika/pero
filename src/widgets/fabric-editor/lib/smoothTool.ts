// @ts-nocheck
import * as fabric from 'fabric';

/**
 * Smooth Tool - Сглаживание углов на путях
 * 
 * Функции:
 * - Автоматическое сглаживание выбранных точек
 * - Алгоритм Catmull-Rom для плавных кривых
 * - Регулируемая интенсивность (tension)
 * - Работа с одной или несколькими точками
 * - Сохранение общей формы контура
 */
export class SmoothTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private selectedPath: fabric.Path | null = null;
  private tension: number = 0.5; // Интенсивность сглаживания (0-1)
  private editPoints: fabric.Circle[] = [];
  private selectedPointIndices: number[] = [];

  constructor(canvas: fabric.Canvas, tension: number = 0.5) {
    this.canvas = canvas;
    this.tension = tension;
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'pointer';

    this.canvas.on('mouse:down', this.handleMouseDown);
    this.canvas.on('mouse:over', this.handleMouseOver);
    this.canvas.on('mouse:out', this.handleMouseOut);

    document.addEventListener('keydown', this.handleKeyDown);

    console.log('✅ [SmoothTool] Activated with tension:', this.tension);
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:over', this.handleMouseOver);
    this.canvas.off('mouse:out', this.handleMouseOut);

    document.removeEventListener('keydown', this.handleKeyDown);

    this.clearHighlights();
    this.selectedPath = null;
    this.selectedPointIndices = [];

    console.log('🔴 [SmoothTool] Deactivated');
  }

  /**
   * Установить интенсивность сглаживания
   */
  public setTension(tension: number) {
    this.tension = Math.max(0, Math.min(1, tension));
    console.log('🎚️ [SmoothTool] Tension set to:', this.tension);
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;

    // Клик на путь
    if (target && target.type === 'path') {
      this.selectPath(target as fabric.Path);
      return;
    }

    // Клик на точку для сглаживания
    if (target && (target as any).isSmoothPoint) {
      const pointIndex = (target as any).pointIndex;
      this.smoothPoint(pointIndex);
    }
  };

  private handleMouseOver = (e: any) => {
    if (!this.isActive || !this.selectedPath) return;

    const target = e.target;
    if (target && (target as any).isSmoothPoint) {
      target.set({ fill: '#10B981', radius: 7 }); // Зеленый hover
      this.canvas.renderAll();
    }
  };

  private handleMouseOut = (e: any) => {
    if (!this.isActive || !this.selectedPath) return;

    const target = e.target;
    if (target && (target as any).isSmoothPoint) {
      target.set({ fill: '#F59E0B', radius: 6 }); // Вернуть оранжевый
      this.canvas.renderAll();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive || !this.selectedPath) return;

    // S = Smooth All (сгладить все точки)
    if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
      this.smoothAllPoints();
      e.preventDefault();
    }

    // + = Увеличить интенсивность
    if (e.key === '+' || e.key === '=') {
      this.setTension(this.tension + 0.1);
      e.preventDefault();
    }

    // - = Уменьшить интенсивность
    if (e.key === '-' || e.key === '_') {
      this.setTension(this.tension - 0.1);
      e.preventDefault();
    }
  };

  /**
   * Выбрать путь для сглаживания
   */
  private selectPath(path: fabric.Path) {
    if (this.selectedPath) {
      this.clearHighlights();
    }

    this.selectedPath = path;
    this.selectedPath.set({
      stroke: '#3B82F6',
      strokeWidth: 3,
    });

    this.highlightCornerPoints();
    this.canvas.renderAll();

    console.log('✅ [SmoothTool] Path selected, found', this.editPoints.length, 'corner points');
  }

  /**
   * Определить и подсветить "угловые" точки (которые можно сгладить)
   */
  private highlightCornerPoints() {
    if (!this.selectedPath || !this.selectedPath.path) return;

    this.clearHighlights();

    this.selectedPath.path.forEach((segment: any, index: number) => {
      // Пропускаем первую точку (M) и последнюю (Z)
      if (index === 0 || segment[0] === 'Z') return;

      // Ищем "угловые" точки (L - прямые линии)
      if (segment[0] === 'L' || segment[0] === 'M') {
        const x = segment[1];
        const y = segment[2];

        // Проверяем является ли это углом (угол между сегментами)
        if (this.isCornerPoint(index)) {
          const point = new fabric.Circle({
            left: x,
            top: y,
            radius: 6,
            fill: '#F59E0B', // Оранжевый для углов
            stroke: '#ffffff',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            hasBorders: false,
            hasControls: false,
            selectable: true,
            hoverCursor: 'pointer',
          });

          (point as any).isSmoothPoint = true;
          (point as any).pointIndex = index;

          this.canvas.add(point);
          this.editPoints.push(point);
        }
      }
    });

    this.canvas.renderAll();
  }

  /**
   * Проверить является ли точка углом (а не уже сглаженной кривой)
   */
  private isCornerPoint(index: number): boolean {
    if (!this.selectedPath || !this.selectedPath.path) return false;

    const prevSeg = this.selectedPath.path[index - 1];
    const currentSeg = this.selectedPath.path[index];
    const nextSeg = this.selectedPath.path[index + 1];

    if (!prevSeg || !currentSeg || !nextSeg) return false;

    // Если текущий или следующий сегмент - кривая (C), то это не угол
    if (currentSeg[0] === 'C' || nextSeg[0] === 'C') return false;

    // Если это прямая линия (L), то это угол
    return currentSeg[0] === 'L' && nextSeg[0] === 'L';
  }

  /**
   * Сгладить одну точку
   */
  private smoothPoint(index: number) {
    if (!this.selectedPath || !this.selectedPath.path) return;

    const path = this.selectedPath.path;

    // Получаем соседние точки
    const prevSeg = path[index - 1];
    const currentSeg = path[index];
    const nextSeg = path[index + 1];

    if (!prevSeg || !currentSeg || !nextSeg) return;

    // Координаты точек
    const x0 = prevSeg[0] === 'M' ? prevSeg[1] : prevSeg[prevSeg.length - 2];
    const y0 = prevSeg[0] === 'M' ? prevSeg[2] : prevSeg[prevSeg.length - 1];
    const x1 = currentSeg[1];
    const y1 = currentSeg[2];
    const x2 = nextSeg[1];
    const y2 = nextSeg[2];

    // Вычисляем контрольные точки по алгоритму Catmull-Rom
    const cp1x = x1 - (x2 - x0) * this.tension * 0.5;
    const cp1y = y1 - (y2 - y0) * this.tension * 0.5;
    const cp2x = x1 + (x2 - x0) * this.tension * 0.5;
    const cp2y = y1 + (y2 - y0) * this.tension * 0.5;

    // Заменяем прямую линию на кривую Безье
    path[index + 1] = ['C', cp1x, cp1y, cp2x, cp2y, x2, y2];

    this.selectedPath.dirty = true;
    this.canvas.renderAll();

    // Обновляем подсветку
    this.clearHighlights();
    this.highlightCornerPoints();

    console.log('✨ [SmoothTool] Point smoothed at index:', index);
  }

  /**
   * Сгладить все угловые точки на пути
   */
  private smoothAllPoints() {
    if (!this.selectedPath || !this.selectedPath.path) return;

    let smoothedCount = 0;
    const path = this.selectedPath.path;

    // Проходим по всем точкам в обратном порядке (чтобы индексы не сбивались)
    for (let i = path.length - 2; i >= 1; i--) {
      if (this.isCornerPoint(i)) {
        this.smoothPointSilent(i);
        smoothedCount++;
      }
    }

    this.selectedPath.dirty = true;
    this.canvas.renderAll();

    // Обновляем подсветку
    this.clearHighlights();
    this.highlightCornerPoints();

    console.log('✨ [SmoothTool] Smoothed', smoothedCount, 'points');
  }

  /**
   * Сгладить точку без обновления UI (для массового сглаживания)
   */
  private smoothPointSilent(index: number) {
    if (!this.selectedPath || !this.selectedPath.path) return;

    const path = this.selectedPath.path;

    const prevSeg = path[index - 1];
    const currentSeg = path[index];
    const nextSeg = path[index + 1];

    if (!prevSeg || !currentSeg || !nextSeg) return;

    const x0 = prevSeg[0] === 'M' ? prevSeg[1] : prevSeg[prevSeg.length - 2];
    const y0 = prevSeg[0] === 'M' ? prevSeg[2] : prevSeg[prevSeg.length - 1];
    const x1 = currentSeg[1];
    const y1 = currentSeg[2];
    const x2 = nextSeg[1];
    const y2 = nextSeg[2];

    const cp1x = x1 - (x2 - x0) * this.tension * 0.5;
    const cp1y = y1 - (y2 - y0) * this.tension * 0.5;
    const cp2x = x1 + (x2 - x0) * this.tension * 0.5;
    const cp2y = y1 + (y2 - y0) * this.tension * 0.5;

    path[index + 1] = ['C', cp1x, cp1y, cp2x, cp2y, x2, y2];
  }

  /**
   * Очистить все подсветки
   */
  private clearHighlights() {
    this.editPoints.forEach(point => this.canvas.remove(point));
    this.editPoints = [];
    this.canvas.renderAll();
  }
}
