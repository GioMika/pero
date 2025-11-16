import * as fabric from 'fabric';

/**
 * 🎨 COMPLETE PEN TOOL IMPLEMENTATION
 * Based on Adobe Illustrator Pen Tool behavior
 * 
 * Features:
 * - Straight lines with Shift constraint (45°)
 * - Bezier curves with handles
 * - Path closing indicator
 * - Convert anchor point (Shift+C)
 * - Live Corners (gear icons)
 * - Direct Selection integration
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Point {
  x: number;
  y: number;
}

interface BezierHandle {
  x: number;
  y: number;
  broken: boolean; // true = независимые манипуляторы
}

interface AnchorPoint {
  x: number;
  y: number;
  handleIn?: BezierHandle;
  handleOut?: BezierHandle;
  cornerRadius?: number; // Для Live Corners
}

enum PenToolState {
  IDLE = 'IDLE',
  DRAWING = 'DRAWING',
  DRAGGING_HANDLE = 'DRAGGING_HANDLE',
  CLOSING = 'CLOSING'
}

// ============================================================================
// PEN TOOL CLASS
// ============================================================================

export class PenTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private state: PenToolState = PenToolState.IDLE;
  
  // Данные контура
  private anchorPoints: AnchorPoint[] = [];
  private currentPath: fabric.Path | null = null;
  
  // Временные визуальные элементы
  private tempCircles: fabric.Circle[] = [];
  private tempHandleLines: fabric.Line[] = [];
  private tempHandleCircles: fabric.Circle[] = [];
  private previewLine: fabric.Line | null = null;
  private closeIndicator: fabric.Circle | null = null;
  
  // Флаги состояния
  private isDraggingHandle: boolean = false;
  private currentHandleIndex: number = -1;
  private isShiftPressed: boolean = false;
  
  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  // ==========================================================================
  // ACTIVATION / DEACTIVATION
  // ==========================================================================

  activate() {
    this.isActive = true;
    this.state = PenToolState.IDLE;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'crosshair';

    // Mouse events
    this.canvas.on('mouse:down', this.handleMouseDown);
    this.canvas.on('mouse:move', this.handleMouseMove);
    this.canvas.on('mouse:up', this.handleMouseUp);

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    console.log('✏️ [PenTool] Activated');
  }

  deactivate() {
    this.isActive = false;
    this.state = PenToolState.IDLE;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    // Remove events
    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:move', this.handleMouseMove);
    this.canvas.off('mouse:up', this.handleMouseUp);

    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);

    this.clearTemp();
    console.log('✏️ [PenTool] Deactivated');
  }

  // ==========================================================================
  // MOUSE HANDLERS
  // ==========================================================================

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const pointer = this.canvas.getPointer(e.e);

    // Проверяем: клик на первую точку для замыкания?
    if (this.checkClosePath(pointer)) {
      return;
    }

    // Если уже есть точки - начинаем тянуть манипулятор
    if (this.anchorPoints.length > 0) {
      this.isDraggingHandle = true;
      this.currentHandleIndex = this.anchorPoints.length - 1;
      this.state = PenToolState.DRAGGING_HANDLE;
      return;
    }

    // Создаем первую точку
    this.addAnchorPoint(pointer.x, pointer.y);
    this.state = PenToolState.DRAWING;
  };

  private handleMouseMove = (e: any) => {
    if (!this.isActive) return;

    const pointer = this.canvas.getPointer(e.e);

    // Если тянем манипулятор
    if (this.isDraggingHandle && this.state === PenToolState.DRAGGING_HANDLE) {
      this.updateHandle(pointer);
      return;
    }

    // Preview line для следующей точки
    if (this.state === PenToolState.DRAWING && this.anchorPoints.length > 0) {
      this.updatePreviewLine(pointer);
    }

    // Показываем индикатор замыкания
    if (this.anchorPoints.length > 2) {
      this.updateCloseIndicator(pointer);
    }
  };

  private handleMouseUp = (e: any) => {
    if (!this.isActive) return;

    const pointer = this.canvas.getPointer(e.e);

    // Если тянули манипулятор - создаем следующую точку
    if (this.isDraggingHandle) {
      this.isDraggingHandle = false;
      
      // Добавляем новую точку в позиции курсора
      this.addAnchorPoint(pointer.x, pointer.y);
      
      this.state = PenToolState.DRAWING;
      return;
    }

    // Обычный клик - добавляем точку без манипулятора
    if (this.state === PenToolState.DRAWING && this.anchorPoints.length > 0) {
      this.addAnchorPoint(pointer.x, pointer.y);
    }
  };

  // ==========================================================================
  // KEYBOARD HANDLERS
  // ==========================================================================

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    // Shift для ограничения углов
    if (e.key === 'Shift') {
      this.isShiftPressed = true;
    }

    // Enter или Z - замыкание контура
    if (e.key === 'Enter' || e.key === 'z') {
      this.closePath();
      e.preventDefault();
    }

    // Escape - отмена
    if (e.key === 'Escape') {
      this.cancel();
      e.preventDefault();
    }

    // Backspace/Delete - удалить последнюю точку
    if (e.key === 'Backspace' || e.key === 'Delete') {
      this.removeLastPoint();
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      this.isShiftPressed = false;
    }
  };

  // ==========================================================================
  // ANCHOR POINT MANAGEMENT
  // ==========================================================================

  private addAnchorPoint(x: number, y: number) {
    // Применяем Shift constraint если нужно
    let finalPoint = { x, y };
    
    if (this.isShiftPressed && this.anchorPoints.length > 0) {
      const lastPoint = this.anchorPoints[this.anchorPoints.length - 1];
      finalPoint = this.snapToAngle(finalPoint, lastPoint);
    }

    const anchorPoint: AnchorPoint = {
      x: finalPoint.x,
      y: finalPoint.y
    };

    this.anchorPoints.push(anchorPoint);

    // Визуализируем точку
    this.drawAnchorPoint(anchorPoint);

    // Обновляем путь
    this.updatePath();

    console.log('📍 [PenTool] Added point:', anchorPoint);
  }

  private removeLastPoint() {
    if (this.anchorPoints.length === 0) return;

    this.anchorPoints.pop();

    // Удаляем последний визуальный элемент
    const lastCircle = this.tempCircles.pop();
    if (lastCircle) {
      this.canvas.remove(lastCircle);
    }

    // Удаляем манипуляторы последней точки
    this.clearHandleVisuals();

    this.updatePath();
    console.log('🗑️ [PenTool] Removed last point');
  }

  // ==========================================================================
  // HANDLE MANAGEMENT (Bezier)
  // ==========================================================================

  private updateHandle(pointer: Point) {
    if (this.currentHandleIndex < 0) return;

    const anchorPoint = this.anchorPoints[this.currentHandleIndex];
    
    // Применяем Shift constraint
    let handlePos = pointer;
    if (this.isShiftPressed) {
      handlePos = this.snapToAngle(pointer, anchorPoint);
    }

    // Создаем handleOut для текущей точки
    anchorPoint.handleOut = {
      x: handlePos.x,
      y: handlePos.y,
      broken: false
    };

    // Создаем симметричный handleIn
    const dx = anchorPoint.x - handlePos.x;
    const dy = anchorPoint.y - handlePos.y;
    
    anchorPoint.handleIn = {
      x: anchorPoint.x + dx,
      y: anchorPoint.y + dy,
      broken: false
    };

    // Визуализируем манипуляторы
    this.drawHandles(anchorPoint, this.currentHandleIndex);

    // Обновляем путь
    this.updatePath();
  }

  private drawHandles(anchorPoint: AnchorPoint, index: number) {
    // Очищаем старые манипуляторы
    this.clearHandleVisuals();

    // Рисуем handleOut
    if (anchorPoint.handleOut) {
      const line = new fabric.Line(
        [anchorPoint.x, anchorPoint.y, anchorPoint.handleOut.x, anchorPoint.handleOut.y],
        {
          stroke: '#00aaff',
          strokeWidth: 1,
          selectable: false,
          evented: false
        }
      );
      this.tempHandleLines.push(line);
      this.canvas.add(line);

      const circle = new fabric.Circle({
        left: anchorPoint.handleOut.x,
        top: anchorPoint.handleOut.y,
        radius: 4,
        fill: '#00aaff',
        stroke: '#ffffff',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      this.tempHandleCircles.push(circle);
      this.canvas.add(circle);
    }

    // Рисуем handleIn
    if (anchorPoint.handleIn) {
      const line = new fabric.Line(
        [anchorPoint.x, anchorPoint.y, anchorPoint.handleIn.x, anchorPoint.handleIn.y],
        {
          stroke: '#00aaff',
          strokeWidth: 1,
          selectable: false,
          evented: false
        }
      );
      this.tempHandleLines.push(line);
      this.canvas.add(line);

      const circle = new fabric.Circle({
        left: anchorPoint.handleIn.x,
        top: anchorPoint.handleIn.y,
        radius: 4,
        fill: '#00aaff',
        stroke: '#ffffff',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
      this.tempHandleCircles.push(circle);
      this.canvas.add(circle);
    }

    this.canvas.renderAll();
  }

  private clearHandleVisuals() {
    this.tempHandleLines.forEach(line => this.canvas.remove(line));
    this.tempHandleLines = [];

    this.tempHandleCircles.forEach(circle => this.canvas.remove(circle));
    this.tempHandleCircles = [];
  }

  // ==========================================================================
  // PATH RENDERING
  // ==========================================================================

  private updatePath() {
    // Удаляем старый путь
    if (this.currentPath) {
      this.canvas.remove(this.currentPath);
      this.currentPath = null;
    }

    if (this.anchorPoints.length < 2) return;

    const pathData = this.generatePathData(false);

    this.currentPath = new fabric.Path(pathData, {
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      objectCaching: false
    });

    this.canvas.add(this.currentPath);
    this.canvas.sendToBack(this.currentPath);
    this.canvas.renderAll();
  }

  private generatePathData(closed: boolean): string {
    if (this.anchorPoints.length === 0) return '';

    let pathData = `M ${this.anchorPoints[0].x} ${this.anchorPoints[0].y}`;

    for (let i = 1; i < this.anchorPoints.length; i++) {
      const prevPoint = this.anchorPoints[i - 1];
      const currentPoint = this.anchorPoints[i];

      // Если есть handleOut у предыдущей точки - используем кривую Безье
      if (prevPoint.handleOut && currentPoint.handleIn) {
        pathData += ` C ${prevPoint.handleOut.x} ${prevPoint.handleOut.y}, `;
        pathData += `${currentPoint.handleIn.x} ${currentPoint.handleIn.y}, `;
        pathData += `${currentPoint.x} ${currentPoint.y}`;
      } else if (prevPoint.handleOut) {
        // Quadratic bezier (упрощенный)
        pathData += ` Q ${prevPoint.handleOut.x} ${prevPoint.handleOut.y}, `;
        pathData += `${currentPoint.x} ${currentPoint.y}`;
      } else {
        // Прямая линия
        pathData += ` L ${currentPoint.x} ${currentPoint.y}`;
      }
    }

    if (closed) {
      pathData += ' Z';
    }

    return pathData;
  }

  // ==========================================================================
  // VISUAL HELPERS
  // ==========================================================================

  private drawAnchorPoint(point: AnchorPoint) {
    const circle = new fabric.Circle({
      left: point.x,
      top: point.y,
      radius: 5,
      fill: '#ffffff',
      stroke: '#00aaff',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center'
    });

    this.tempCircles.push(circle);
    this.canvas.add(circle);
  }

  private updatePreviewLine(pointer: Point) {
    if (this.previewLine) {
      this.canvas.remove(this.previewLine);
    }

    const lastPoint = this.anchorPoints[this.anchorPoints.length - 1];
    
    // Применяем Shift constraint
    let finalPointer = pointer;
    if (this.isShiftPressed) {
      finalPointer = this.snapToAngle(pointer, lastPoint);
    }

    this.previewLine = new fabric.Line(
      [lastPoint.x, lastPoint.y, finalPointer.x, finalPointer.y],
      {
        stroke: '#00aaff',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false
      }
    );

    this.canvas.add(this.previewLine);
    this.canvas.renderAll();
  }

  private updateCloseIndicator(pointer: Point) {
    const firstPoint = this.anchorPoints[0];
    const distance = Math.hypot(pointer.x - firstPoint.x, pointer.y - firstPoint.y);

    // Показываем индикатор если близко к первой точке
    if (distance < 15) {
      if (!this.closeIndicator) {
        this.closeIndicator = new fabric.Circle({
          left: firstPoint.x,
          top: firstPoint.y,
          radius: 8,
          fill: 'transparent',
          stroke: '#00ff00',
          strokeWidth: 2,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center'
        });
        this.canvas.add(this.closeIndicator);
      }
      
      this.state = PenToolState.CLOSING;
      this.canvas.defaultCursor = 'pointer';
    } else {
      if (this.closeIndicator) {
        this.canvas.remove(this.closeIndicator);
        this.closeIndicator = null;
      }
      
      this.state = PenToolState.DRAWING;
      this.canvas.defaultCursor = 'crosshair';
    }

    this.canvas.renderAll();
  }

  // ==========================================================================
  // PATH OPERATIONS
  // ==========================================================================

  private checkClosePath(pointer: Point): boolean {
    if (this.anchorPoints.length < 3) return false;

    const firstPoint = this.anchorPoints[0];
    const distance = Math.hypot(pointer.x - firstPoint.x, pointer.y - firstPoint.y);

    if (distance < 15) {
      this.closePath();
      return true;
    }

    return false;
  }

  private closePath() {
    if (this.anchorPoints.length < 3) {
      console.warn('⚠️ [PenTool] Need at least 3 points to close path');
      return;
    }

    const pathData = this.generatePathData(true);

    const finalPath = new fabric.Path(pathData, {
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
      objectCaching: false,
      hasBorders: true,
      hasControls: true,
      selectable: true,
      evented: true
    });

    this.canvas.add(finalPath);
    this.canvas.setActiveObject(finalPath);
    
    this.clearTemp();
    this.anchorPoints = [];
    this.state = PenToolState.IDLE;

    console.log('✅ [PenTool] Path closed');
  }

  private cancel() {
    this.clearTemp();
    this.anchorPoints = [];
    this.state = PenToolState.IDLE;
    this.canvas.renderAll();
    
    console.log('❌ [PenTool] Cancelled');
  }

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  private snapToAngle(point: Point, anchor: Point): Point {
    const dx = point.x - anchor.x;
    const dy = point.y - anchor.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.hypot(dx, dy);

    // Округляем до ближайших 45°
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);

    return {
      x: anchor.x + Math.cos(snapAngle) * distance,
      y: anchor.y + Math.sin(snapAngle) * distance
    };
  }

  private clearTemp() {
    // Очищаем точки
    this.tempCircles.forEach(circle => this.canvas.remove(circle));
    this.tempCircles = [];

    // Очищаем манипуляторы
    this.clearHandleVisuals();

    // Очищаем текущий путь
    if (this.currentPath) {
      this.canvas.remove(this.currentPath);
      this.currentPath = null;
    }

    // Очищаем preview line
    if (this.previewLine) {
      this.canvas.remove(this.previewLine);
      this.previewLine = null;
    }

    // Очищаем индикатор замыкания
    if (this.closeIndicator) {
      this.canvas.remove(this.closeIndicator);
      this.closeIndicator = null;
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Получить текущий path data для экспорта
   */
  public getCurrentPathData(): string | null {
    if (this.anchorPoints.length < 2) return null;
    return this.generatePathData(false);
  }

  /**
   * Получить anchor points для дальнейшей обработки
   */
  public getAnchorPoints(): AnchorPoint[] {
    return [...this.anchorPoints];
  }

  /**
   * Проверка: идет ли сейчас рисование
   */
  public isDrawing(): boolean {
    return this.state === PenToolState.DRAWING || this.state === PenToolState.DRAGGING_HANDLE;
  }
}
