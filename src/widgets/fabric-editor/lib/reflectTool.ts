import * as fabric from 'fabric';

export class ReflectTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private selectedObject: fabric.Object | null = null;
  private reflectAxisH: fabric.Line | null = null;
  private reflectAxisV: fabric.Line | null = null;

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

    this.clearReflectAxes();
    this.selectedObject = null;
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;

    // Кликнули на объект - выбираем для отражения
    if (target && target.selectable && target.type !== 'line') {
      this.selectObject(target);
    } else if (!target) {
      // Кликнули мимо - снимаем выделение
      this.deselectObject();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive || !this.selectedObject) return;

    // H - отражение по горизонтали
    if (e.key === 'h' || e.key === 'H') {
      this.reflectHorizontal();
      e.preventDefault();
    }
    // V - отражение по вертикали
    else if (e.key === 'v' || e.key === 'V') {
      this.reflectVertical();
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

    // Показываем оси отражения
    this.showReflectAxes();

    this.canvas.renderAll();
  }

  private deselectObject() {
    if (this.selectedObject) {
      this.selectedObject.set({
        selectable: true,
        lockMovementX: false,
        lockMovementY: false,
      });
      this.clearReflectAxes();
      this.selectedObject = null;
      this.canvas.renderAll();
    }
  }

  private showReflectAxes() {
    if (!this.selectedObject) return;

    const bounds = this.selectedObject.getBoundingRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;

    // Горизонтальная ось (для вертикального отражения)
    this.reflectAxisV = new fabric.Line(
        [centerX, bounds.top - 20, centerX, bounds.top + bounds.height + 20],
        {
          stroke: '#ff00ff',
          strokeWidth: 2,
          strokeDashArray: [10, 5],
          selectable: false,
          evented: false,
        }
    );

    // Вертикальная ось (для горизонтального отражения)
    this.reflectAxisH = new fabric.Line(
        [bounds.left - 20, centerY, bounds.left + bounds.width + 20, centerY],
        {
          stroke: '#00ffff',
          strokeWidth: 2,
          strokeDashArray: [10, 5],
          selectable: false,
          evented: false,
        }
    );

    this.canvas.add(this.reflectAxisV, this.reflectAxisH);
    this.canvas.renderAll();
  }

  private clearReflectAxes() {
    if (this.reflectAxisH) {
      this.canvas.remove(this.reflectAxisH);
      this.reflectAxisH = null;
    }
    if (this.reflectAxisV) {
      this.canvas.remove(this.reflectAxisV);
      this.reflectAxisV = null;
    }
  }

  private reflectHorizontal() {
    if (!this.selectedObject) return;

    // Отражаем по горизонтали (flipY)
    const currentFlipY = this.selectedObject.flipY || false;
    this.selectedObject.set({
      flipY: !currentFlipY,
    });

    this.selectedObject.setCoords();
    this.canvas.renderAll();

    // Показываем анимацию
    this.animateReflect('horizontal');
  }

  private reflectVertical() {
    if (!this.selectedObject) return;

    // Отражаем по вертикали (flipX)
    const currentFlipX = this.selectedObject.flipX || false;
    this.selectedObject.set({
      flipX: !currentFlipX,
    });

    this.selectedObject.setCoords();
    this.canvas.renderAll();

    // Показываем анимацию
    this.animateReflect('vertical');
  }

  private animateReflect(axis: 'horizontal' | 'vertical') {
    const line = axis === 'horizontal' ? this.reflectAxisH : this.reflectAxisV;
    if (!line) return;

    // Краткая анимация оси
    const originalStrokeWidth = line.strokeWidth || 2;

    line.set({ strokeWidth: 4, stroke: '#ffff00' });
    this.canvas.renderAll();

    setTimeout(() => {
      line.set({
        strokeWidth: originalStrokeWidth,
        stroke: axis === 'horizontal' ? '#00ffff' : '#ff00ff'
      });
      this.canvas.renderAll();
    }, 200);
  }
}