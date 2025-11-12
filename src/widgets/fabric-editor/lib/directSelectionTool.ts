import * as fabric from 'fabric';
import { FabricTools } from './fabricTools';

export class DirectSelectionTool {
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

    const pointer = this.canvas.getPointer(e.e);
    const target = e.target;

    // Если кликнули на путь - начинаем редактирование
    if (target && target.type === 'path') {
      this.selectPath(target as fabric.Path);
    } else if (!target) {
      // Кликнули мимо - снимаем выделение
      this.deselectPath();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.deleteSelectedPoint();
      e.preventDefault();
    }
  };

  private selectPath(path: fabric.Path) {
    // Снимаем предыдущее выделение
    if (this.selectedPath) {
      this.clearEditPoints();
    }

    this.selectedPath = path;
    this.selectedPath.selectable = false;
    this.selectedPath.evented = false;

    // Создаем точки редактирования
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

        // Создаем точку якоря
        const circle = new fabric.Circle({
          left: x - 5,
          top: y - 5,
          radius: 5,
          fill: '#ffffff',
          stroke: '#00aaff',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          hasBorders: false,
          hasControls: false,
          selectable: true,
          hoverCursor: 'move',
        });

        (circle as any).pathIndex = index;
        (circle as any).isAnchorPoint = true;

        // Обработчик перемещения точки
        circle.on('moving', () => {
          this.updatePathPoint(index, circle.left! + 5, circle.top! + 5);
        });

        this.canvas.add(circle);
        this.editPoints.push({ circle, pathIndex: index });

      } else if (segment[0] === 'C') {
        // Кубическая кривая Безье
        const cp1x = segment[1];
        const cp1y = segment[2];
        const cp2x = segment[3];
        const cp2y = segment[4];
        const x = segment[5];
        const y = segment[6];

        // Точка якоря
        const anchorCircle = new fabric.Circle({
          left: x - 5,
          top: y - 5,
          radius: 5,
          fill: '#ffffff',
          stroke: '#00aaff',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          hasBorders: false,
          hasControls: false,
          selectable: true,
          hoverCursor: 'move',
        });

        (anchorCircle as any).pathIndex = index;
        (anchorCircle as any).isAnchorPoint = true;

        anchorCircle.on('moving', () => {
          this.updatePathPoint(index, anchorCircle.left! + 5, anchorCircle.top! + 5);
        });

        // Контрольная точка 1 (handle out предыдущей точки)
        const handle1Circle = new fabric.Circle({
          left: cp1x - 3,
          top: cp1y - 3,
          radius: 3,
          fill: '#ff6600',
          stroke: '#ffffff',
          strokeWidth: 1,
          originX: 'center',
          originY: 'center',
          hasBorders: false,
          hasControls: false,
          selectable: true,
          hoverCursor: 'move',
        });

        (handle1Circle as any).pathIndex = index;
        (handle1Circle as any).isHandle = true;
        (handle1Circle as any).handleType = 'cp1';

        handle1Circle.on('moving', () => {
          this.updateHandle(index, 'cp1', handle1Circle.left! + 3, handle1Circle.top! + 3);
        });

        // Линия к контрольной точке 1
        const handle1Line = new fabric.Line([x, y, cp1x, cp1y], {
          stroke: '#ff6600',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });

        // Контрольная точка 2 (handle in текущей точки)
        const handle2Circle = new fabric.Circle({
          left: cp2x - 3,
          top: cp2y - 3,
          radius: 3,
          fill: '#ff6600',
          stroke: '#ffffff',
          strokeWidth: 1,
          originX: 'center',
          originY: 'center',
          hasBorders: false,
          hasControls: false,
          selectable: true,
          hoverCursor: 'move',
        });

        (handle2Circle as any).pathIndex = index;
        (handle2Circle as any).isHandle = true;
        (handle2Circle as any).handleType = 'cp2';

        handle2Circle.on('moving', () => {
          this.updateHandle(index, 'cp2', handle2Circle.left! + 3, handle2Circle.top! + 3);
        });

        // Линия к контрольной точке 2
        const handle2Line = new fabric.Line([x, y, cp2x, cp2y], {
          stroke: '#ff6600',
          strokeWidth: 1,
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

  private updatePathPoint(index: number, x: number, y: number) {
    if (!this.selectedPath || !this.selectedPath.path) return;

    const segment = this.selectedPath.path[index];

    if (segment[0] === 'M' || segment[0] === 'L') {
      segment[1] = x;
      segment[2] = y;
    } else if (segment[0] === 'C') {
      segment[5] = x;
      segment[6] = y;
    }

    this.selectedPath.dirty = true;
    this.updateHandleLines();
    this.canvas.renderAll();
  }

  private updateHandle(index: number, handleType: 'cp1' | 'cp2', x: number, y: number) {
    if (!this.selectedPath || !this.selectedPath.path) return;

    const segment = this.selectedPath.path[index];

    if (segment[0] === 'C') {
      if (handleType === 'cp1') {
        segment[1] = x;
        segment[2] = y;
      } else if (handleType === 'cp2') {
        segment[3] = x;
        segment[4] = y;
      }
    }

    this.selectedPath.dirty = true;
    this.updateHandleLines();
    this.canvas.renderAll();
  }

  private updateHandleLines() {
    this.editPoints.forEach(point => {
      if (!this.selectedPath || !this.selectedPath.path) return;

      const segment = this.selectedPath.path[point.pathIndex];

      if (segment[0] === 'C') {
        const x = segment[5];
        const y = segment[6];
        const cp1x = segment[1];
        const cp1y = segment[2];
        const cp2x = segment[3];
        const cp2y = segment[4];

        if (point.handleOutLine) {
          point.handleOutLine.set({ x1: x, y1: y, x2: cp1x, y2: cp1y });
        }

        if (point.handleInLine) {
          point.handleInLine.set({ x1: x, y1: y, x2: cp2x, y2: cp2y });
        }
      }
    });
  }

  private deleteSelectedPoint() {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || !(activeObject as any).isAnchorPoint) return;

    const pathIndex = (activeObject as any).pathIndex;

    if (this.selectedPath && this.selectedPath.path && this.selectedPath.path.length > 3) {
      // Удаляем точку из пути
      this.selectedPath.path.splice(pathIndex, 1);
      this.selectedPath.dirty = true;

      // Пересоздаем точки редактирования
      this.clearEditPoints();
      this.createEditPoints();

      this.canvas.renderAll();
    }
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