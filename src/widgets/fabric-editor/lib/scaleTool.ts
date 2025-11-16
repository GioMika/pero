// @ts-nocheck
import * as fabric from 'fabric';

export class ScaleTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private selectedObject: fabric.Object | null = null;
  private scaleCenter: fabric.Circle | null = null;
  private isScaling: boolean = false;
  private startPoint: fabric.Point | null = null;
  private initialScaleX: number = 1;
  private initialScaleY: number = 1;
  private initialWidth: number = 0;
  private initialHeight: number = 0;
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

    // НЕ блокируем объект, просто выделяем
    this.selectedObject.set({
      lockMovementX: false,
      lockMovementY: false,
    });

    this.initialScaleX = this.selectedObject.scaleX || 1;
    this.initialScaleY = this.selectedObject.scaleY || 1;

    // Запоминаем начальные размеры
    const bounds = this.selectedObject.getBoundingRect();
    this.initialWidth = bounds.width;
    this.initialHeight = bounds.height;

    // Показываем центр масштабирования
    this.showScaleCenter();

    this.canvas.setActiveObject(this.selectedObject);
    this.canvas.renderAll();
  }

  private deselectObject() {
    if (this.selectedObject) {
      this.selectedObject.set({
        lockMovementX: false,
        lockMovementY: false,
      });
      this.clearScaleCenter();
      this.selectedObject = null;
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
    }
  }

  private showScaleCenter() {
    if (!this.selectedObject) return;

    this.clearScaleCenter();

    const center = this.selectedObject.getCenterPoint();

    this.scaleCenter = new fabric.Circle({
      left: center.x,
      top: center.y,
      radius: 6,
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
    this.startPoint = pointer;

    const center = this.selectedObject.getCenterPoint();
    this.centerPoint = center;

    this.initialScaleX = this.selectedObject.scaleX || 1;
    this.initialScaleY = this.selectedObject.scaleY || 1;
  }

  private scaleObject(pointer: fabric.Point, uniformScale: boolean = false) {
    if (!this.selectedObject || !this.centerPoint || !this.startPoint) return;

    // Вычисляем смещение от начальной точки
    const deltaX = pointer.x - this.startPoint.x;
    const deltaY = pointer.y - this.startPoint.y;

    // Коэффициент масштабирования (чем дальше тянем, тем больше)
    const scaleFactorX = 1 + deltaX / 200;
    const scaleFactorY = 1 + deltaY / 200;

    if (uniformScale) {
      // Пропорциональное масштабирование (Shift)
      // Используем больший коэффициент
      const scaleFactor = Math.max(scaleFactorX, scaleFactorY);
      const newScale = Math.max(0.1, this.initialScaleX * scaleFactor);

      this.selectedObject.set({
        scaleX: newScale,
        scaleY: newScale,
      });
    } else {
      // Непропорциональное масштабирование
      const newScaleX = Math.max(0.1, this.initialScaleX * scaleFactorX);
      const newScaleY = Math.max(0.1, this.initialScaleY * scaleFactorY);

      this.selectedObject.set({
        scaleX: newScaleX,
        scaleY: newScaleY,
      });
    }

    this.selectedObject.setCoords();
    this.canvas.renderAll();
  }

  private scaleByPercent(factor: number) {
    if (!this.selectedObject) return;

    const currentScaleX = this.selectedObject.scaleX || 1;
    const currentScaleY = this.selectedObject.scaleY || 1;

    const newScaleX = Math.max(0.1, currentScaleX * factor);
    const newScaleY = Math.max(0.1, currentScaleY * factor);

    this.selectedObject.set({
      scaleX: newScaleX,
      scaleY: newScaleY,
    });

    this.selectedObject.setCoords();
    this.canvas.renderAll();
  }
}