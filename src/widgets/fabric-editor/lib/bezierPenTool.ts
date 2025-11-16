// @ts-nocheck
import * as fabric from 'fabric';

export class BezierPenTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private points: Array<{ x: number; y: number; handleIn?: fabric.Point; handleOut?: fabric.Point }> = [];
  private tempPoints: fabric.Circle[] = [];
  private tempHandles: fabric.Line[] = [];
  private currentPath: fabric.Path | null = null;
  private isDraggingHandle: boolean = false;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'crosshair';

    this.canvas.on('mouse:down', this.handleMouseDown);
    this.canvas.on('mouse:move', this.handleMouseMove);
    this.canvas.on('mouse:up', this.handleMouseUp);

    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:move', this.handleMouseMove);
    this.canvas.off('mouse:up', this.handleMouseUp);

    document.removeEventListener('keydown', this.handleKeyDown);

    this.clearTemp();
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const pointer = this.canvas.getPointer(e.e);

    if (this.points.length > 2) {
      const firstPoint = this.points[0];
      const distance = Math.sqrt(
          Math.pow(pointer.x - firstPoint.x, 2) + Math.pow(pointer.y - firstPoint.y, 2)
      );

      if (distance < 10) {
        this.closePath();
        return;
      }
    }

    this.isDraggingHandle = true;
    this.addPoint(pointer.x, pointer.y);
  };

  private handleMouseMove = (e: any) => {
    if (!this.isActive) return;

    const pointer = this.canvas.getPointer(e.e);

    // Если тянем - создаем Безье ручку
    if (this.isDraggingHandle && this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1];

      const handleX = pointer.x - lastPoint.x;
      const handleY = pointer.y - lastPoint.y;

      // Только если действительно тянем (расстояние > 3px)
      const distance = Math.sqrt(handleX * handleX + handleY * handleY);

      if (distance > 3) {
        lastPoint.handleOut = new fabric.Point(handleX, handleY);
        lastPoint.handleIn = new fabric.Point(-handleX, -handleY);

        this.updatePath();
        this.drawHandles();
      }
    }

    // НЕТ БОЛЬШЕ previewLine! ВСЁ!
  };

  private handleMouseUp = () => {
    this.isDraggingHandle = false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    if (e.key === 'Enter') {
      this.finishPath();
    } else if (e.key === 'Escape') {
      this.cancel();
    } else if (e.key === 'Backspace') {
      this.removeLastPoint();
      e.preventDefault();
    }
  };

  private addPoint(x: number, y: number) {
    this.points.push({
      x,
      y,
      handleIn: new fabric.Point(0, 0),
      handleOut: new fabric.Point(0, 0)
    });

    const point = new fabric.Circle({
      left: x,
      top: y,
      radius: 4,
      fill: '#00aaff',
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
    });

    this.tempPoints.push(point);
    this.canvas.add(point);

    if (this.points.length > 1) {
      this.updatePath();
    }

    this.canvas.renderAll();
  }

  private updatePath() {
    if (this.currentPath) {
      this.canvas.remove(this.currentPath);
    }

    if (this.points.length < 2) return;

    let pathData = `M ${this.points[0].x} ${this.points[0].y}`;

    for (let i = 1; i < this.points.length; i++) {
      const prevPoint = this.points[i - 1];
      const currPoint = this.points[i];

      if (prevPoint.handleOut && (prevPoint.handleOut.x !== 0 || prevPoint.handleOut.y !== 0)) {
        const cp1x = prevPoint.x + (prevPoint.handleOut?.x || 0);
        const cp1y = prevPoint.y + (prevPoint.handleOut?.y || 0);
        const cp2x = currPoint.x + (currPoint.handleIn?.x || 0);
        const cp2y = currPoint.y + (currPoint.handleIn?.y || 0);

        pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currPoint.x} ${currPoint.y}`;
      } else {
        pathData += ` L ${currPoint.x} ${currPoint.y}`;
      }
    }

    this.currentPath = new fabric.Path(pathData, {
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      objectCaching: false,
    });

    this.canvas.add(this.currentPath);
    this.canvas.renderAll();
  }

  private drawHandles() {
    this.tempHandles.forEach(handle => this.canvas.remove(handle));
    this.tempHandles = [];

    if (this.points.length === 0) return;

    const lastPoint = this.points[this.points.length - 1];

    if (lastPoint.handleOut && (lastPoint.handleOut.x !== 0 || lastPoint.handleOut.y !== 0)) {
      const handleLine = new fabric.Line(
          [
            lastPoint.x,
            lastPoint.y,
            lastPoint.x + lastPoint.handleOut.x,
            lastPoint.y + lastPoint.handleOut.y
          ],
          {
            stroke: '#00aaff',
            strokeWidth: 1,
            selectable: false,
            evented: false,
          }
      );

      const handleCircle = new fabric.Circle({
        left: lastPoint.x + lastPoint.handleOut.x,
        top: lastPoint.y + lastPoint.handleOut.y,
        radius: 3,
        fill: '#00aaff',
        stroke: '#ffffff',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });

      this.tempHandles.push(handleLine, handleCircle);
      this.canvas.add(handleLine, handleCircle);
    }

    this.canvas.renderAll();
  }

  private closePath() {
    if (this.points.length < 3) return;

    let pathData = `M ${this.points[0].x} ${this.points[0].y}`;

    for (let i = 1; i < this.points.length; i++) {
      const prevPoint = this.points[i - 1];
      const currPoint = this.points[i];

      if (prevPoint.handleOut && (prevPoint.handleOut.x !== 0 || prevPoint.handleOut.y !== 0)) {
        const cp1x = prevPoint.x + (prevPoint.handleOut?.x || 0);
        const cp1y = prevPoint.y + (prevPoint.handleOut?.y || 0);
        const cp2x = currPoint.x + (currPoint.handleIn?.x || 0);
        const cp2y = currPoint.y + (currPoint.handleIn?.y || 0);

        pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currPoint.x} ${currPoint.y}`;
      } else {
        pathData += ` L ${currPoint.x} ${currPoint.y}`;
      }
    }

    const firstPoint = this.points[0];
    const lastPoint = this.points[this.points.length - 1];

    if (lastPoint.handleOut && (lastPoint.handleOut.x !== 0 || lastPoint.handleOut.y !== 0)) {
      const cp1x = lastPoint.x + (lastPoint.handleOut?.x || 0);
      const cp1y = lastPoint.y + (lastPoint.handleOut?.y || 0);
      const cp2x = firstPoint.x + (firstPoint.handleIn?.x || 0);
      const cp2y = firstPoint.y + (firstPoint.handleIn?.y || 0);

      pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${firstPoint.x} ${firstPoint.y}`;
    } else {
      pathData += ` L ${firstPoint.x} ${firstPoint.y}`;
    }

    pathData += ' Z';

    const finalPath = new fabric.Path(pathData, {
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
      objectCaching: false,
      hasBorders: true,
      hasControls: true,
      selectable: true,
      evented: true,
    });

    this.clearTemp();
    this.canvas.add(finalPath);
    this.canvas.setActiveObject(finalPath);
    this.canvas.renderAll();

    this.points = [];
  }

  private finishPath() {
    if (this.points.length < 2) return;

    let pathData = `M ${this.points[0].x} ${this.points[0].y}`;

    for (let i = 1; i < this.points.length; i++) {
      const prevPoint = this.points[i - 1];
      const currPoint = this.points[i];

      if (prevPoint.handleOut && (prevPoint.handleOut.x !== 0 || prevPoint.handleOut.y !== 0)) {
        const cp1x = prevPoint.x + (prevPoint.handleOut?.x || 0);
        const cp1y = prevPoint.y + (prevPoint.handleOut?.y || 0);
        const cp2x = currPoint.x + (currPoint.handleIn?.x || 0);
        const cp2y = currPoint.y + (currPoint.handleIn?.y || 0);

        pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currPoint.x} ${currPoint.y}`;
      } else {
        pathData += ` L ${currPoint.x} ${currPoint.y}`;
      }
    }

    const finalPath = new fabric.Path(pathData, {
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
      objectCaching: false,
      hasBorders: true,
      hasControls: true,
      selectable: true,
      evented: true,
    });

    this.clearTemp();
    this.canvas.add(finalPath);
    this.canvas.setActiveObject(finalPath);
    this.canvas.renderAll();

    this.points = [];
  }

  private removeLastPoint() {
    if (this.points.length === 0) return;

    this.points.pop();

    const lastTempPoint = this.tempPoints.pop();
    if (lastTempPoint) {
      this.canvas.remove(lastTempPoint);
    }

    this.updatePath();
    this.canvas.renderAll();
  }

  private cancel() {
    this.clearTemp();
    this.points = [];
    this.canvas.renderAll();
  }

  private clearTemp() {
    this.tempPoints.forEach(point => this.canvas.remove(point));
    this.tempPoints = [];

    this.tempHandles.forEach(handle => this.canvas.remove(handle));
    this.tempHandles = [];

    if (this.currentPath) {
      this.canvas.remove(this.currentPath);
      this.currentPath = null;
    }
  }
}