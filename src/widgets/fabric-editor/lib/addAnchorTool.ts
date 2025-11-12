// @ts-nocheck
import * as fabric from 'fabric';

export class AddAnchorTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private selectedPath: fabric.Path | null = null;
  private previewPoint: fabric.Circle | null = null;
  private hoveredSegment: { index: number; point: { x: number; y: number } } | null = null;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'crosshair';

    this.canvas.on('mouse:down', this.handleMouseDown);
    this.canvas.on('mouse:move', this.handleMouseMove);
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:move', this.handleMouseMove);

    this.clearPreview();
    this.selectedPath = null;
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;

    // Кликнули на путь - выбираем
    if (target && target.type === 'path') {
      this.selectedPath = target as fabric.Path;
    } else if (!target && this.hoveredSegment && this.selectedPath) {
      // Кликнули на превью точку - добавляем
      this.addPointToPath(this.hoveredSegment.index, this.hoveredSegment.point);
    } else {
      // Кликнули мимо - снимаем выделение
      this.selectedPath = null;
      this.clearPreview();
    }
  };

  private handleMouseMove = (e: any) => {
    if (!this.isActive || !this.selectedPath) return;

    const pointer = this.canvas.getPointer(e.e);

    // Находим ближайший сегмент пути
    const nearestSegment = this.findNearestSegment(this.selectedPath, pointer);

    if (nearestSegment && nearestSegment.distance < 10) {
      // Показываем превью точки
      this.showPreview(nearestSegment.point);
      this.hoveredSegment = {
        index: nearestSegment.segmentIndex,
        point: nearestSegment.point,
      };
      this.canvas.defaultCursor = 'pointer';
    } else {
      this.clearPreview();
      this.hoveredSegment = null;
      this.canvas.defaultCursor = 'crosshair';
    }
  };

  private findNearestSegment(path: fabric.Path, pointer: fabric.Point) {
    if (!path.path) return null;

    let minDistance = Infinity;
    let nearestPoint = { x: 0, y: 0 };
    let nearestSegmentIndex = 0;

    for (let i = 0; i < path.path.length - 1; i++) {
      const seg1 = path.path[i];
      const seg2 = path.path[i + 1];

      let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

      // Получаем координаты начала и конца сегмента
      if (seg1[0] === 'M' || seg1[0] === 'L') {
        x1 = seg1[1];
        y1 = seg1[2];
      } else if (seg1[0] === 'C') {
        x1 = seg1[5];
        y1 = seg1[6];
      }

      if (seg2[0] === 'L') {
        x2 = seg2[1];
        y2 = seg2[2];
      } else if (seg2[0] === 'C') {
        x2 = seg2[5];
        y2 = seg2[6];
      } else if (seg2[0] === 'Z') {
        // Замыкающий сегмент - берем первую точку
        const firstSeg = path.path[0];
        if (firstSeg[0] === 'M') {
          x2 = firstSeg[1];
          y2 = firstSeg[2];
        }
      }

      // Находим ближайшую точку на линии
      const closestPoint = this.getClosestPointOnLine(
          pointer.x,
          pointer.y,
          x1,
          y1,
          x2,
          y2
      );

      const distance = Math.sqrt(
          Math.pow(pointer.x - closestPoint.x, 2) + Math.pow(pointer.y - closestPoint.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = closestPoint;
        nearestSegmentIndex = i + 1; // Вставляем после текущего сегмента
      }
    }

    return {
      distance: minDistance,
      point: nearestPoint,
      segmentIndex: nearestSegmentIndex,
    };
  }

  private getClosestPointOnLine(
      px: number,
      py: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number
  ) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    return { x: xx, y: yy };
  }

  private showPreview(point: { x: number; y: number }) {
    if (this.previewPoint) {
      this.previewPoint.set({
        left: point.x - 4,
        top: point.y - 4,
      });
    } else {
      this.previewPoint = new fabric.Circle({
        left: point.x - 4,
        top: point.y - 4,
        radius: 4,
        fill: '#00ff00',
        stroke: '#ffffff',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      this.canvas.add(this.previewPoint);
    }
    this.canvas.renderAll();
  }

  private clearPreview() {
    if (this.previewPoint) {
      this.canvas.remove(this.previewPoint);
      this.previewPoint = null;
      this.canvas.renderAll();
    }
  }

  private addPointToPath(segmentIndex: number, point: { x: number; y: number }) {
    if (!this.selectedPath || !this.selectedPath.path) return;

    // Вставляем новую точку L (прямая линия)
    this.selectedPath.path.splice(segmentIndex, 0, ['L', point.x, point.y]);
    this.selectedPath.dirty = true;

    this.canvas.renderAll();

    // Очищаем превью
    this.clearPreview();
    this.hoveredSegment = null;

    // Визуальная обратная связь
    this.flashAddedPoint(point);
  }

  private flashAddedPoint(point: { x: number; y: number }) {
    // Краткая анимация добавленной точки
    const flashPoint = new fabric.Circle({
      left: point.x - 6,
      top: point.y - 6,
      radius: 6,
      fill: '#00ff00',
      stroke: '#ffffff',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });

    this.canvas.add(flashPoint);
    this.canvas.renderAll();

    setTimeout(() => {
      this.canvas.remove(flashPoint);
      this.canvas.renderAll();
    }, 300);
  }
}