// @ts-nocheck
import * as fabric from 'fabric';

export class DeleteAnchorTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private selectedPath: fabric.Path | null = null;
  private editPoints: Array<{
    circle: fabric.Circle;
    pathIndex: number;
  }> = [];

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'default';

    this.canvas.on('mouse:down', this.handleMouseDown);
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);

    this.clearEditPoints();
    this.selectedPath = null;
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;

    // Кликнули на точку - удаляем
    if (target && (target as any).isDeletePoint) {
      this.deletePoint(target);
      return;
    }

    // Кликнули на путь - выбираем для редактирования
    if (target && target.type === 'path') {
      this.selectPath(target as fabric.Path);
    } else if (!target) {
      // Кликнули мимо - снимаем выделение
      this.deselectPath();
    }
  };

  private selectPath(path: fabric.Path) {
    if (this.selectedPath) {
      this.clearEditPoints();
    }

    this.selectedPath = path;
    this.selectedPath.selectable = false;
    this.selectedPath.evented = false;

    this.createEditPoints();
  }

  private deselectPath() {
    if (this.selectedPath) {
      this.selectedPath.selectable = true;
      this.selectedPath.evented = true;
      this.clearEditPoints();
      this.selectedPath = null;
    }
  }

  private createEditPoints() {
    if (!this.selectedPath || !this.selectedPath.path) return;

    let pointCount = 0;

    // Считаем количество точек (минимум должно быть 3)
    this.selectedPath.path.forEach((segment: any) => {
      if (segment[0] === 'M' || segment[0] === 'L' || segment[0] === 'C') {
        pointCount++;
      }
    });

    this.selectedPath.path.forEach((segment: any, index: number) => {
      let x = 0, y = 0;

      if (segment[0] === 'M' || segment[0] === 'L') {
        x = segment[1];
        y = segment[2];
      } else if (segment[0] === 'C') {
        x = segment[5];
        y = segment[6];
      } else {
        return; // Пропускаем Z и другие
      }

      // Создаем красную точку для удаления
      const circle = new fabric.Circle({
        left: x - 5,
        top: y - 5,
        radius: 5,
        fill: pointCount <= 3 ? '#cccccc' : '#ff0000', // Серая если нельзя удалить
        stroke: '#ffffff',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        hasBorders: false,
        hasControls: false,
        selectable: true,
        hoverCursor: pointCount <= 3 ? 'not-allowed' : 'pointer',
      });

      (circle as any).pathIndex = index;
      (circle as any).isDeletePoint = true;
      (circle as any).canDelete = pointCount > 3;

      this.canvas.add(circle);
      this.editPoints.push({ circle, pathIndex: index });
    });

    this.canvas.renderAll();
  }

  private deletePoint(circle: fabric.Circle) {
    if (!this.selectedPath || !this.selectedPath.path) return;

    const canDelete = (circle as any).canDelete;

    if (!canDelete) {
      // Визуальная обратная связь - нельзя удалить
      this.flashError(circle);
      return;
    }

    const pathIndex = (circle as any).pathIndex;

    // Удаляем точку из пути
    this.selectedPath.path.splice(pathIndex, 1);
    this.selectedPath.dirty = true;

    // Перерисовываем точки
    this.clearEditPoints();
    this.createEditPoints();

    this.canvas.renderAll();

    // Визуальная обратная связь - удалено
    this.flashDeleted();
  }

  private flashError(circle: fabric.Circle) {
    const originalFill = circle.fill;

    circle.set({ fill: '#ffff00' });
    this.canvas.renderAll();

    setTimeout(() => {
      circle.set({ fill: originalFill });
      this.canvas.renderAll();
    }, 200);
  }

  private flashDeleted() {
    // Можно добавить эффект удаления
    const text = new fabric.Text('Point Deleted!', {
      left: this.canvas.width! / 2,
      top: 50,
      fontSize: 20,
      fill: '#ff0000',
      fontFamily: 'Arial',
      originX: 'center',
      selectable: false,
      evented: false,
    });

    this.canvas.add(text);
    this.canvas.renderAll();

    setTimeout(() => {
      this.canvas.remove(text);
      this.canvas.renderAll();
    }, 500);
  }

  private clearEditPoints() {
    this.editPoints.forEach(point => {
      this.canvas.remove(point.circle);
    });

    this.editPoints = [];
    this.canvas.renderAll();
  }
}