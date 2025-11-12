import * as fabric from 'fabric';

export class ConvertAnchorTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private selectedPath: fabric.Path | null = null;
  private editPoints: Array<{
    circle: fabric.Circle;
    pathIndex: number;
    handleInCircle?: fabric.Circle;
    handleOutCircle?: fabric.Circle;
    handleInLine?: fabric.Line;
    handleOutLine?: fabric.Line;
  }> = [];

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'default';

    this.canvas.on('mouse:down', this.handleMouseDown);

    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);

    document.removeEventListener('keydown', this.handleKeyDown);

    this.clearEditPoints();
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;

    // Кликнули на точку - конвертируем
    if (target && (target as any).isAnchorPoint) {
      this.convertPoint(target);
      return;
    }

    // Кликнули на путь - выбираем
    if (target && target.type === 'path') {
      this.selectPath(target as fabric.Path);
    } else if (!target) {
      this.deselectPath();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    // Alt/Option + клик тоже можно использовать для конвертации
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

    this.selectedPath.path.forEach((segment: any, index: number) => {
      if (segment[0] === 'M' || segment[0] === 'L') {
        const x = segment[1];
        const y = segment[2];

        // Точка якоря (угловая)
        const circle = new fabric.Circle({
          left: x - 5,
          top: y - 5,
          radius: 5,
          fill: '#ff6600',
          stroke: '#ffffff',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          hasBorders: false,
          hasControls: false,
          selectable: true,
          hoverCursor: 'pointer',
        });

        (circle as any).pathIndex = index;
        (circle as any).isAnchorPoint = true;
        (circle as any).isSmooth = false;

        this.canvas.add(circle);
        this.editPoints.push({ circle, pathIndex: index });

      } else if (segment[0] === 'C') {
        const cp1x = segment[1];
        const cp1y = segment[2];
        const cp2x = segment[3];
        const cp2y = segment[4];
        const x = segment[5];
        const y = segment[6];

        // Точка якоря (плавная)
        const anchorCircle = new fabric.Circle({
          left: x - 5,
          top: y - 5,
          radius: 5,
          fill: '#00aaff',
          stroke: '#ffffff',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          hasBorders: false,
          hasControls: false,
          selectable: true,
          hoverCursor: 'pointer',
        });

        (anchorCircle as any).pathIndex = index;
        (anchorCircle as any).isAnchorPoint = true;
        (anchorCircle as any).isSmooth = true;

        // Линии к ручкам
        const handle1Line = new fabric.Line([x, y, cp1x, cp1y], {
          stroke: '#00aaff',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });

        const handle2Line = new fabric.Line([x, y, cp2x, cp2y], {
          stroke: '#00aaff',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });

        // Ручки
        const handle1Circle = new fabric.Circle({
          left: cp1x - 3,
          top: cp1y - 3,
          radius: 3,
          fill: '#00aaff',
          stroke: '#ffffff',
          strokeWidth: 1,
          originX: 'center',
          originY: 'center',
          hasBorders: false,
          hasControls: false,
          selectable: false,
          evented: false,
        });

        const handle2Circle = new fabric.Circle({
          left: cp2x - 3,
          top: cp2y - 3,
          radius: 3,
          fill: '#00aaff',
          stroke: '#ffffff',
          strokeWidth: 1,
          originX: 'center',
          originY: 'center',
          hasBorders: false,
          hasControls: false,
          selectable: false,
          evented: false,
        });

        this.canvas.add(handle1Line, handle1Circle, handle2Line, handle2Circle, anchorCircle);

        this.editPoints.push({
          circle: anchorCircle,
          pathIndex: index,
          handleInCircle: handle2Circle,
          handleOutCircle: handle1Circle,
          handleInLine: handle2Line,
          handleOutLine: handle1Line,
        });
      }
    });

    this.canvas.renderAll();
  }

  private convertPoint(circle: fabric.Circle) {
    if (!this.selectedPath || !this.selectedPath.path) return;

    const pathIndex = (circle as any).pathIndex;
    const isSmooth = (circle as any).isSmooth;
    const segment = this.selectedPath.path[pathIndex];

    if (isSmooth) {
      // Smooth -> Corner (C -> L)
      if (segment[0] === 'C') {
        const x = segment[5];
        const y = segment[6];
        this.selectedPath.path[pathIndex] = ['L', x, y];
      }
    } else {
      // Corner -> Smooth (L -> C)
      if (segment[0] === 'L') {
        const x = segment[1];
        const y = segment[2];

        // Находим предыдущую точку
        let prevX = x;
        let prevY = y;
        if (pathIndex > 0) {
          const prevSegment = this.selectedPath.path[pathIndex - 1];
          if (prevSegment[0] === 'M' || prevSegment[0] === 'L') {
            prevX = prevSegment[1];
            prevY = prevSegment[2];
          } else if (prevSegment[0] === 'C') {
            prevX = prevSegment[5];
            prevY = prevSegment[6];
          }
        }

        // Находим следующую точку
        let nextX = x;
        let nextY = y;
        if (pathIndex < this.selectedPath.path.length - 1) {
          const nextSegment = this.selectedPath.path[pathIndex + 1];
          if (nextSegment[0] === 'L') {
            nextX = nextSegment[1];
            nextY = nextSegment[2];
          } else if (nextSegment[0] === 'C') {
            nextX = nextSegment[5];
            nextY = nextSegment[6];
          }
        }

        // Создаем контрольные точки на 1/3 расстояния
        const cp1x = prevX + (x - prevX) * 0.66;
        const cp1y = prevY + (y - prevY) * 0.66;
        const cp2x = x + (nextX - x) * 0.33;
        const cp2y = y + (nextY - y) * 0.33;

        this.selectedPath.path[pathIndex] = ['C', cp1x, cp1y, cp2x, cp2y, x, y];
      } else if (segment[0] === 'M') {
        // Не конвертируем M (moveTo)
        return;
      }
    }

    this.selectedPath.dirty = true;

    // Перерисовываем точки
    this.clearEditPoints();
    this.createEditPoints();

    this.canvas.renderAll();
  }

  private clearEditPoints() {
    this.editPoints.forEach(point => {
      this.canvas.remove(point.circle);
      if (point.handleInCircle) this.canvas.remove(point.handleInCircle);
      if (point.handleOutCircle) this.canvas.remove(point.handleOutCircle);
      if (point.handleInLine) this.canvas.remove(point.handleInLine);
      if (point.handleOutLine) this.canvas.remove(point.handleOutLine);
    });

    this.editPoints = [];
    this.canvas.renderAll();
  }
}