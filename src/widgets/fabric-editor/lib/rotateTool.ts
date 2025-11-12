import * as fabric from 'fabric';

export class RotateTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private selectedObject: fabric.Object | null = null;
  private rotationCenter: fabric.Circle | null = null;
  private isRotating: boolean = false;
  private startAngle: number = 0;
  private initialRotation: number = 0;

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

    this.clearRotationCenter();
    this.selectedObject = null;
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const pointer = this.canvas.getPointer(e.e);
    const target = e.target;

    // Кликнули на объект - выбираем для вращения
    if (target && target.selectable && target.type !== 'line') {
      this.selectObject(target);
      this.startRotation(pointer);
    } else if (!target) {
      // Кликнули мимо - снимаем выделение
      this.deselectObject();
    }
  };

  private handleMouseMove = (e: any) => {
    if (!this.isActive || !this.isRotating || !this.selectedObject) return;

    const pointer = this.canvas.getPointer(e.e);
    this.rotateObject(pointer);
  };

  private handleMouseUp = () => {
    this.isRotating = false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive || !this.selectedObject) return;

    // Поворот стрелками (по 15°)
    if (e.key === 'ArrowLeft') {
      this.rotateByAngle(-15);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      this.rotateByAngle(15);
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

    // Показываем центр вращения
    this.showRotationCenter();

    this.canvas.renderAll();
  }

  private deselectObject() {
    if (this.selectedObject) {
      this.selectedObject.set({
        selectable: true,
        lockMovementX: false,
        lockMovementY: false,
      });
      this.clearRotationCenter();
      this.selectedObject = null;
      this.canvas.renderAll();
    }
  }

  private showRotationCenter() {
    if (!this.selectedObject) return;

    const center = this.selectedObject.getCenterPoint();

    this.rotationCenter = new fabric.Circle({
      left: center.x - 5,
      top: center.y - 5,
      radius: 5,
      fill: '#00aaff',
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
    });

    this.canvas.add(this.rotationCenter);
    this.canvas.renderAll();
  }

  private clearRotationCenter() {
    if (this.rotationCenter) {
      this.canvas.remove(this.rotationCenter);
      this.rotationCenter = null;
    }
  }

  private startRotation(pointer: fabric.Point) {
    if (!this.selectedObject) return;

    this.isRotating = true;

    const center = this.selectedObject.getCenterPoint();
    this.startAngle = Math.atan2(pointer.y - center.y, pointer.x - center.x);
    this.initialRotation = this.selectedObject.angle || 0;
  }

  private rotateObject(pointer: fabric.Point) {
    if (!this.selectedObject) return;

    const center = this.selectedObject.getCenterPoint();
    const currentAngle = Math.atan2(pointer.y - center.y, pointer.x - center.x);

    // Вычисляем разницу углов
    let deltaAngle = (currentAngle - this.startAngle) * (180 / Math.PI);

    // Новый угол поворота
    let newAngle = this.initialRotation + deltaAngle;

    // Округляем до 15° если зажат Shift
    const evt = (this.canvas as any)._currentTransform?.e;
    if (evt && evt.shiftKey) {
      newAngle = Math.round(newAngle / 15) * 15;
    }

    this.selectedObject.rotate(newAngle);
    this.canvas.renderAll();
  }

  private rotateByAngle(angle: number) {
    if (!this.selectedObject) return;

    const currentAngle = this.selectedObject.angle || 0;
    this.selectedObject.rotate(currentAngle + angle);
    this.canvas.renderAll();
  }
}