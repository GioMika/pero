import * as fabric from 'fabric';

export class ScaleTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private selectedObject: fabric.Object | null = null;
  private scaleCenter: fabric.Circle | null = null;
  private isScaling: boolean = false;
  private startDistance: number = 0;
  private initialScaleX: number = 1;
  private initialScaleY: number = 1;
  private centerPoint: fabric.Point | null = null;

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
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:move', this.handleMouseMove);
    this.canvas.off('mouse:up', this.handleMouseUp);

    document.removeEventListener('keydown', this.handleKeyDown);

    this.clearScaleCenter();
    this.selectedObject = null;
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const pointer = this.canvas.getPointer(e.e);
    const target = e.target;

    // Кликнули на объект - выбираем для масштабирования
    if (target && target.selectable && target.type !== 'line') {
      this.selectObject(target);
      this.startScaling(pointer);
    } else if (!target) {
      // Кликнули мимо - снимаем выделение
      this.deselectObject();
    }
  };

  private handleMouseMove = (e: any) => {
    if (!this.isActive || !this.isScaling || !this.selectedObject) return;

    const pointer = this.canvas.getPointer(e.e);
    const evt = e.e as MouseEvent;
    this.scaleObject(pointer, evt.shiftKey);
  };

  private handleMouseUp = () => {
    this.isScaling = false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive || !this.selectedObject) return;

    // Масштабирование стрелками (по 10%)
    if (e.key === 'ArrowUp') {
      this.scaleByPercent(1.1);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      this.scaleByPercent(0.9);
      e.preventDefault();
    }
  };

  private selectObject(obj: fabric.Object) {
    if (this.selectedObject) {
      this.deselectObject();
    }

    this.selectedObject = obj;
    this.selectedObject.set({
      selectable: false,
      evented: true,
      lockMovementX: true,
      lockMovementY: true,
    });

    this.initialScaleX = this.selectedObject.scaleX || 1;
    this.initialScaleY = this.selectedObject.scaleY || 1;

    // Показываем центр масштабирования
    this.showScaleCenter();

    this.canvas.renderAll();
  }

  private deselectObject() {
    if (this.selectedObject) {
      this.selectedObject.set({
        selectable: true,
        lockMovementX: false,
        lockMovementY: false,
      });
      this.clearScaleCenter();
      this.selectedObject = null;
      this.canvas.renderAll();
    }
  }

  private showScaleCenter() {
    if (!this.selectedObject) return;

    const center = this.selectedObject.getCenterPoint();

    this.scaleCenter = new fabric.Circle({
      left: center.x - 5,
      top: center.y - 5,
      radius: 5,
      fill: '#ff00ff',
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
    });

    this.canvas.add(this.scaleCenter);
    this.canvas.renderAll();
  }

  private clearScaleCenter() {
    if (this.scaleCenter) {
      this.canvas.remove(this.scaleCenter);
      this.scaleCenter = null;
    }
  }

  private startScaling(pointer: fabric.Point) {
    if (!this.selectedObject) return;

    this.isScaling = true;

    const center = this.selectedObject.getCenterPoint();
    this.centerPoint = center;

    // Вычисляем начальное расстояние от центра до курсора
    this.startDistance = Math.sqrt(
        Math.pow(pointer.x - center.x, 2) + Math.pow(pointer.y - center.y, 2)
    );

    this.initialScaleX = this.selectedObject.scaleX || 1;
    this.initialScaleY = this.selectedObject.scaleY || 1;
  }

  private scaleObject(pointer: fabric.Point, uniformScale: boolean = false) {
    if (!this.selectedObject || !this.centerPoint) return;

    // Текущее расстояние от центра до курсора
    const currentDistance = Math.sqrt(
        Math.pow(pointer.x - this.centerPoint.x, 2) +
        Math.pow(pointer.y - this.centerPoint.y, 2)
    );

    // Коэффициент масштабирования
    const scaleFactor = currentDistance / this.startDistance;

    if (uniformScale) {
      // Пропорциональное масштабирование (Shift)
      const newScale = this.initialScaleX * scaleFactor;
      this.selectedObject.set({
        scaleX: newScale,
        scaleY: newScale,
      });
    } else {
      // Непропорциональное масштабирование
      const angle = Math.atan2(
          pointer.y - this.centerPoint.y,
          pointer.x - this.centerPoint.x
      );

      // Определяем основную ось по углу
      const absAngle = Math.abs(angle);
      const isHorizontal = absAngle < Math.PI / 4 || absAngle > (3 * Math.PI) / 4;

      if (isHorizontal) {
        // Масштабируем по горизонтали
        this.selectedObject.set({
          scaleX: this.initialScaleX * scaleFactor,
          scaleY: this.initialScaleY,
        });
      } else {
        // Масштабируем по вертикали
        this.selectedObject.set({
          scaleX: this.initialScaleX,
          scaleY: this.initialScaleY * scaleFactor,
        });
      }
    }

    this.selectedObject.setCoords();
    this.canvas.renderAll();
  }

  private scaleByPercent(factor: number) {
    if (!this.selectedObject) return;

    const currentScaleX = this.selectedObject.scaleX || 1;
    const currentScaleY = this.selectedObject.scaleY || 1;

    this.selectedObject.set({
      scaleX: currentScaleX * factor,
      scaleY: currentScaleY * factor,
    });

    this.selectedObject.setCoords();
    this.canvas.renderAll();
  }
}