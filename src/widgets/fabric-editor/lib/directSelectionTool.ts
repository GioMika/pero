// @ts-nocheck
import * as fabric from 'fabric';

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
    isSelected?: boolean;
  }> = [];
  private segmentPoints: fabric.Circle[] = [];
  private selectedPoints: number[] = [];
  private isDraggingSegment: boolean = false;
  private draggedSegmentIndex: number = -1;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'default';

    this.canvas.on('mouse:down', this.handleMouseDown);
    this.canvas.on('mouse:move', this.handleMouseMove);
    this.canvas.on('mouse:up', this.handleMouseUp);

    document.addEventListener('keydown', this.handleKeyDown);

    // 🔥 АВТОМАТИЧЕСКИ АКТИВИРУЕМ РЕДАКТИРОВАНИЕ ПЕРВОГО ПУТИ
    this.autoActivateFirstPath();
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:move', this.handleMouseMove);
    this.canvas.off('mouse:up', this.handleMouseUp);

    document.removeEventListener('keydown', this.handleKeyDown);

    this.clearEditPoints();
  }

  // 🔥 ПУБЛИЧНЫЙ МЕТОД ДЛЯ ВНЕШНЕЙ АКТИВАЦИИ
  public selectPath(path: fabric.Path) {
    if (!path || path.type !== 'path') {
      console.warn('⚠️ Cannot select non-path object');
      return;
    }

    this.internalSelectPath(path);
  }

  // 🔥 АВТОМАТИЧЕСКАЯ АКТИВАЦИЯ ПЕРВОГО ПУТИ
  private autoActivateFirstPath() {
    // Используем requestAnimationFrame для гарантии что canvas отрендерился
    requestAnimationFrame(() => {
      setTimeout(() => {
        const objects = this.canvas.getObjects();
        const firstPath = objects.find(obj => obj.type === 'path' && obj.selectable);

        if (firstPath && (firstPath as fabric.Path).path) {
          this.internalSelectPath(firstPath as fabric.Path);
          console.log('✅ [DirectSelect] Path auto-selected with', (firstPath as fabric.Path).path.length, 'segments');
        } else {
          console.warn('⚠️ [DirectSelect] No path found for auto-selection');
        }
      }, 150); // Увеличено с 50ms до 150ms для стабильности
    });
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;
    const evt = e.e as MouseEvent;

    // Клик на точку якоря
    if (target && (target as any).isAnchorPoint) {
      const pathIndex = (target as any).pathIndex;

      if (evt.shiftKey) {
        this.togglePointSelection(pathIndex);
      } else {
        this.clearPointSelection();
        this.selectPoint(pathIndex);
      }
      return;
    }

    // Клик на середину сегмента
    if (target && (target as any).isSegmentPoint) {
      const segmentIndex = (target as any).segmentIndex;
      this.startDraggingSegment(segmentIndex);
      return;
    }

    // Клик на путь
    if (target && target.type === 'path') {
      this.internalSelectPath(target as fabric.Path);
    } else if (!target) {
      this.deselectPath();
    }
  };

  private handleMouseMove = (e: any) => {
    if (!this.isActive || !this.isDraggingSegment) return;

    const pointer = this.canvas.getPointer(e.e);
    this.updateSegmentCurve(this.draggedSegmentIndex, pointer);
  };

  private handleMouseUp = () => {
    this.isDraggingSegment = false;
    this.draggedSegmentIndex = -1;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedPoints.length === 2) {
        this.deleteSegmentBetweenPoints();
      } else if (this.selectedPoints.length === 1) {
        this.deleteSelectedPoint();
      }
      e.preventDefault();
    }
  };

  private internalSelectPath(path: fabric.Path) {
    if (this.selectedPath) {
      this.clearEditPoints();
    }

    this.selectedPath = path;
    this.selectedPath.selectable = false;
    this.selectedPath.evented = false;

    this.createEditPoints();
    this.createSegmentPoints();

    console.log('✅ [DirectSelect] Path selected, points created:', this.editPoints.length, 'anchors,', this.segmentPoints.length, 'segments');
  }

  private deselectPath() {
    if (this.selectedPath) {
      this.selectedPath.selectable = true;
      this.selectedPath.evented = true;
      this.clearEditPoints();
      this.selectedPath = null;
    }
    this.selectedPoints = [];
  }

  private createEditPoints() {
    if (!this.selectedPath || !this.selectedPath.path) return;

    this.selectedPath.path.forEach((segment: any, index: number) => {
      if (segment[0] === 'M' || segment[0] === 'L') {
        const x = segment[1];
        const y = segment[2];

        const circle = new fabric.Circle({
          left: x,
          top: y,
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

        circle.on('moving', () => {
          this.updatePathPoint(index, circle.left!, circle.top!);
        });

        this.canvas.add(circle);
        this.editPoints.push({ circle, pathIndex: index });

      } else if (segment[0] === 'C') {
        const cp1x = segment[1];
        const cp1y = segment[2];
        const cp2x = segment[3];
        const cp2y = segment[4];
        const x = segment[5];
        const y = segment[6];

        const anchorCircle = new fabric.Circle({
          left: x,
          top: y,
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
          this.updatePathPoint(index, anchorCircle.left!, anchorCircle.top!);
        });

        const handle1Circle = new fabric.Circle({
          left: cp1x,
          top: cp1y,
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
          this.updateHandle(index, 'cp1', handle1Circle.left!, handle1Circle.top!);
        });

        const handle1Line = new fabric.Line([x, y, cp1x, cp1y], {
          stroke: '#ff6600',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });

        const handle2Circle = new fabric.Circle({
          left: cp2x,
          top: cp2y,
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
          this.updateHandle(index, 'cp2', handle2Circle.left!, handle2Circle.top!);
        });

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
      } else if (segment[0] === 'A') {
        const x = segment[6];
        const y = segment[7];

        const circle = new fabric.Circle({
          left: x,
          top: y,
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

        circle.on('moving', () => {
          this.updatePathPoint(index, circle.left!, circle.top!);
        });

        this.canvas.add(circle);
        this.editPoints.push({ circle, pathIndex: index });
      }
    });

    this.canvas.renderAll();
  }

  private createSegmentPoints() {
    if (!this.selectedPath || !this.selectedPath.path) return;

    this.segmentPoints.forEach(point => this.canvas.remove(point));
    this.segmentPoints = [];

    for (let i = 0; i < this.selectedPath.path.length - 1; i++) {
      const seg1 = this.selectedPath.path[i];
      const seg2 = this.selectedPath.path[i + 1];

      let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

      if (seg1[0] === 'M' || seg1[0] === 'L') {
        x1 = seg1[1];
        y1 = seg1[2];
      } else if (seg1[0] === 'C') {
        x1 = seg1[5];
        y1 = seg1[6];
      } else if (seg1[0] === 'A') {
        x1 = seg1[6];
        y1 = seg1[7];
      }

      if (seg2[0] === 'L') {
        x2 = seg2[1];
        y2 = seg2[2];
      } else if (seg2[0] === 'C') {
        x2 = seg2[5];
        y2 = seg2[6];
      } else if (seg2[0] === 'A') {
        x2 = seg2[6];
        y2 = seg2[7];
      } else if (seg2[0] === 'Z') {
        const firstSeg = this.selectedPath.path[0];
        if (firstSeg[0] === 'M') {
          x2 = firstSeg[1];
          y2 = firstSeg[2];
        }
      }

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const segmentPoint = new fabric.Circle({
        left: midX,
        top: midY,
        radius: 4,
        fill: '#00ff00',
        stroke: '#ffffff',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hoverCursor: 'move',
      });

      (segmentPoint as any).isSegmentPoint = true;
      (segmentPoint as any).segmentIndex = i;

      this.canvas.add(segmentPoint);
      this.segmentPoints.push(segmentPoint);
    }

    this.canvas.renderAll();
  }

  private togglePointSelection(index: number) {
    const pointIndex = this.selectedPoints.indexOf(index);

    if (pointIndex > -1) {
      this.selectedPoints.splice(pointIndex, 1);
      this.updatePointVisuals(index, false);
    } else {
      this.selectedPoints.push(index);
      this.updatePointVisuals(index, true);
    }

    console.log('✅ Selected points:', this.selectedPoints);
  }

  private selectPoint(index: number) {
    this.selectedPoints = [index];
    this.updateAllPointVisuals();
  }

  private clearPointSelection() {
    this.selectedPoints = [];
    this.updateAllPointVisuals();
  }

  private updatePointVisuals(index: number, selected: boolean) {
    const point = this.editPoints.find(p => p.pathIndex === index);
    if (point) {
      point.circle.set({
        fill: selected ? '#ff0000' : '#ffffff',
        stroke: selected ? '#ffffff' : '#00aaff',
      });
      this.canvas.renderAll();
    }
  }

  private updateAllPointVisuals() {
    this.editPoints.forEach(point => {
      const selected = this.selectedPoints.includes(point.pathIndex);
      point.circle.set({
        fill: selected ? '#ff0000' : '#ffffff',
        stroke: selected ? '#ffffff' : '#00aaff',
      });
    });
    this.canvas.renderAll();
  }

  private startDraggingSegment(segmentIndex: number) {
    this.isDraggingSegment = true;
    this.draggedSegmentIndex = segmentIndex;
    console.log('🟢 Dragging segment:', segmentIndex);
  }

  private updateSegmentCurve(segmentIndex: number, pointer: fabric.Point) {
    if (!this.selectedPath || !this.selectedPath.path) return;

    const seg1 = this.selectedPath.path[segmentIndex];
    const seg2 = this.selectedPath.path[segmentIndex + 1];

    if (!seg1 || !seg2) return;

    if (seg2[0] === 'L') {
      const x1 = seg1[0] === 'M' ? seg1[1] : seg1[5];
      const y1 = seg1[0] === 'M' ? seg1[2] : seg1[6];
      const x2 = seg2[1];
      const y2 = seg2[2];

      const cp1x = pointer.x;
      const cp1y = pointer.y;
      const cp2x = pointer.x;
      const cp2y = pointer.y;

      this.selectedPath.path[segmentIndex + 1] = ['C', cp1x, cp1y, cp2x, cp2y, x2, y2];
    } else if (seg2[0] === 'C') {
      seg2[1] = pointer.x;
      seg2[2] = pointer.y;
      seg2[3] = pointer.x;
      seg2[4] = pointer.y;
    }

    this.selectedPath.dirty = true;

    this.clearEditPoints();
    this.createEditPoints();
    this.createSegmentPoints();
  }

  private deleteSegmentBetweenPoints() {
    if (this.selectedPoints.length !== 2 || !this.selectedPath) return;

    const [index1, index2] = this.selectedPoints.sort((a, b) => a - b);

    console.log(`✂️ Deleting segment between points ${index1} and ${index2}`);

    const deleteCount = index2 - index1;
    this.selectedPath.path.splice(index1 + 1, deleteCount);

    this.selectedPath.dirty = true;
    this.clearPointSelection();
    this.clearEditPoints();
    this.createEditPoints();
    this.createSegmentPoints();

    console.log('✅ Segment deleted!');
  }

  private deleteSelectedPoint() {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || !(activeObject as any).isAnchorPoint) return;

    const pathIndex = (activeObject as any).pathIndex;

    if (this.selectedPath && this.selectedPath.path && this.selectedPath.path.length > 3) {
      this.selectedPath.path.splice(pathIndex, 1);
      this.selectedPath.dirty = true;

      this.clearEditPoints();
      this.createEditPoints();
      this.createSegmentPoints();
    }
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
    } else if (segment[0] === 'A') {
      segment[6] = x;
      segment[7] = y;
    }

    this.selectedPath.dirty = true;
    this.updateHandleLines();
    this.createSegmentPoints();
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

  private clearEditPoints() {
    this.editPoints.forEach(point => {
      this.canvas.remove(point.circle);
      if (point.handleInCircle) this.canvas.remove(point.handleInCircle);
      if (point.handleOutCircle) this.canvas.remove(point.handleOutCircle);
      if (point.handleInLine) this.canvas.remove(point.handleInLine);
      if (point.handleOutLine) this.canvas.remove(point.handleOutLine);
    });

    this.segmentPoints.forEach(point => this.canvas.remove(point));
    this.segmentPoints = [];

    this.editPoints = [];
    this.canvas.renderAll();
  }
}