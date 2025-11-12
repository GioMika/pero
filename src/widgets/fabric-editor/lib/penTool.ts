import * as fabric from 'fabric';

export class PenTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private currentPath: fabric.Path | null = null;
  private points: { x: number; y: number }[] = [];
  private tempPoints: fabric.Circle[] = [];
  private previewLine: fabric.Line | null = null;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'crosshair';

    this.canvas.on('mouse:down', this.handleMouseDown);
    this.canvas.on('mouse:move', this.handleMouseMove);

    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:move', this.handleMouseMove);

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

    this.addPoint(pointer.x, pointer.y);
  };

  private handleMouseMove = (e: any) => {
    if (!this.isActive || this.points.length === 0) return;

    const pointer = this.canvas.getPointer(e.e);

    if (this.previewLine) {
      this.canvas.remove(this.previewLine);
    }

    const lastPoint = this.points[this.points.length - 1];
    this.previewLine = new fabric.Line(
        [lastPoint.x, lastPoint.y, pointer.x, pointer.y],
        {
          stroke: '#00aaff',
          strokeWidth: 1,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
        }
    );

    this.canvas.add(this.previewLine);
    this.canvas.renderAll();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    if (e.key === 'Enter') {
      this.closePath();
    } else if (e.key === 'Escape') {
      this.cancel();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      this.removeLastPoint();
      e.preventDefault();
    }
  };

  private addPoint(x: number, y: number) {
    this.points.push({ x, y });

    const point = new fabric.Circle({
      left: x - 4,
      top: y - 4,
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
      pathData += ` L ${this.points[i].x} ${this.points[i].y}`;
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

  private closePath() {
    if (this.points.length < 3) return;

    let pathData = `M ${this.points[0].x} ${this.points[0].y}`;

    for (let i = 1; i < this.points.length; i++) {
      pathData += ` L ${this.points[i].x} ${this.points[i].y}`;
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

    if (this.currentPath) {
      this.canvas.remove(this.currentPath);
      this.currentPath = null;
    }

    if (this.previewLine) {
      this.canvas.remove(this.previewLine);
      this.previewLine = null;
    }
  }
}