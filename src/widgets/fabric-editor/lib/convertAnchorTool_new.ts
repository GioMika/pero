import * as fabric from 'fabric';

/**
 * 🔧 CONVERT ANCHOR POINT TOOL (Shift+C)
 * 
 * Функции:
 * 1. Клик на точку → Ломает манипуляторы (независимые)
 * 2. Клик на линию → Создает манипуляторы на сегменте
 * 3. Drag манипулятора → Изменяет форму кривой
 */

interface PathPoint {
  x: number;
  y: number;
  command: string;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}

export class ConvertAnchorTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  
  // Выбранный path
  private selectedPath: fabric.Path | null = null;
  private pathPoints: PathPoint[] = [];
  
  // Визуализация
  private anchorCircles: fabric.Circle[] = [];
  private handleLines: fabric.Line[] = [];
  private handleCircles: fabric.Circle[] = [];
  
  // Drag state
  private isDragging: boolean = false;
  private draggedHandleIndex: number = -1;
  private draggedHandleType: 'in' | 'out' | null = null;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  // ==========================================================================
  // ACTIVATION / DEACTIVATION
  // ==========================================================================

  activate() {
    this.isActive = true;
    this.canvas.defaultCursor = 'crosshair';

    // Events
    this.canvas.on('mouse:down', this.handleMouseDown);
    this.canvas.on('mouse:move', this.handleMouseMove);
    this.canvas.on('mouse:up', this.handleMouseUp);
    this.canvas.on('selection:created', this.handleSelection);
    this.canvas.on('selection:updated', this.handleSelection);

    console.log('🔧 [ConvertAnchor] Activated');

    // Если уже есть выбранный объект - работаем с ним
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && activeObject.type === 'path') {
      this.selectPath(activeObject as fabric.Path);
    }
  }

  deactivate() {
    this.isActive = false;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:move', this.handleMouseMove);
    this.canvas.off('mouse:up', this.handleMouseUp);
    this.canvas.off('selection:created', this.handleSelection);
    this.canvas.off('selection:updated', this.handleSelection);

    this.clearVisuals();
    console.log('🔧 [ConvertAnchor] Deactivated');
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  private handleSelection = (e: any) => {
    const selected = e.selected?.[0] || e.target;
    
    if (selected && selected.type === 'path') {
      this.selectPath(selected as fabric.Path);
    } else {
      this.clearVisuals();
      this.selectedPath = null;
    }
  };

  private handleMouseDown = (e: any) => {
    if (!this.isActive || !this.selectedPath) return;

    const pointer = this.canvas.getPointer(e.e);

    // Проверяем клик на манипулятор
    const handleClick = this.checkHandleClick(pointer);
    if (handleClick) {
      this.isDragging = true;
      this.draggedHandleIndex = handleClick.index;
      this.draggedHandleType = handleClick.type;
      return;
    }

    // Проверяем клик на точку
    const pointClick = this.checkPointClick(pointer);
    if (pointClick !== -1) {
      this.breakHandles(pointClick);
      return;
    }

    // Проверяем клик на линию (сегмент)
    const segmentClick = this.checkSegmentClick(pointer);
    if (segmentClick !== -1) {
      this.createHandlesOnSegment(segmentClick, pointer);
      return;
    }
  };

  private handleMouseMove = (e: any) => {
    if (!this.isDragging || !this.selectedPath) return;

    const pointer = this.canvas.getPointer(e.e);
    this.updateDraggedHandle(pointer);
  };

  private handleMouseUp = (e: any) => {
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedHandleIndex = -1;
      this.draggedHandleType = null;
      
      // Обновляем path в canvas
      this.applyChangesToPath();
    }
  };

  // ==========================================================================
  // PATH SELECTION & PARSING
  // ==========================================================================

  private selectPath(path: fabric.Path) {
    this.selectedPath = path;
    this.parsePathData();
    this.visualizePath();
    
    console.log('📍 [ConvertAnchor] Selected path with', this.pathPoints.length, 'points');
  }

  private parsePathData() {
    if (!this.selectedPath || !this.selectedPath.path) return;

    this.pathPoints = [];
    const pathArray = this.selectedPath.path;

    for (let i = 0; i < pathArray.length; i++) {
      const cmd = pathArray[i];
      const command = cmd[0] as string;

      switch (command) {
        case 'M': // MoveTo
          this.pathPoints.push({
            x: cmd[1] as number,
            y: cmd[2] as number,
            command: 'M'
          });
          break;

        case 'L': // LineTo
          this.pathPoints.push({
            x: cmd[1] as number,
            y: cmd[2] as number,
            command: 'L'
          });
          break;

        case 'Q': // Quadratic Bezier
          this.pathPoints.push({
            x: cmd[3] as number,
            y: cmd[4] as number,
            command: 'Q',
            handleOut: { x: cmd[1] as number, y: cmd[2] as number }
          });
          break;

        case 'C': // Cubic Bezier
          const prevIndex = this.pathPoints.length - 1;
          if (prevIndex >= 0) {
            this.pathPoints[prevIndex].handleOut = {
              x: cmd[1] as number,
              y: cmd[2] as number
            };
          }
          
          this.pathPoints.push({
            x: cmd[5] as number,
            y: cmd[6] as number,
            command: 'C',
            handleIn: { x: cmd[3] as number, y: cmd[4] as number }
          });
          break;

        case 'Z': // ClosePath
          // Ignore
          break;
      }
    }
  }

  // ==========================================================================
  // VISUALIZATION
  // ==========================================================================

  private visualizePath() {
    this.clearVisuals();

    // Рисуем anchor points
    this.pathPoints.forEach((point, index) => {
      this.drawAnchorPoint(point, index);
      
      if (point.handleIn) {
        this.drawHandle(point, point.handleIn, 'in', index);
      }
      
      if (point.handleOut) {
        this.drawHandle(point, point.handleOut, 'out', index);
      }
    });

    this.canvas.renderAll();
  }

  private drawAnchorPoint(point: PathPoint, index: number) {
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
      originY: 'center',
      data: { type: 'anchor', index }
    });

    this.anchorCircles.push(circle);
    this.canvas.add(circle);
  }

  private drawHandle(anchor: PathPoint, handle: { x: number; y: number }, type: 'in' | 'out', index: number) {
    // Линия от anchor к handle
    const line = new fabric.Line(
      [anchor.x, anchor.y, handle.x, handle.y],
      {
        stroke: '#00aaff',
        strokeWidth: 1,
        selectable: false,
        evented: false
      }
    );
    this.handleLines.push(line);
    this.canvas.add(line);

    // Кружок на конце handle
    const circle = new fabric.Circle({
      left: handle.x,
      top: handle.y,
      radius: 4,
      fill: '#00aaff',
      stroke: '#ffffff',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      data: { type: 'handle', handleType: type, index }
    });
    
    this.handleCircles.push(circle);
    this.canvas.add(circle);
  }

  private clearVisuals() {
    this.anchorCircles.forEach(c => this.canvas.remove(c));
    this.anchorCircles = [];

    this.handleLines.forEach(l => this.canvas.remove(l));
    this.handleLines = [];

    this.handleCircles.forEach(c => this.canvas.remove(c));
    this.handleCircles = [];
  }

  // ==========================================================================
  // INTERACTION DETECTION
  // ==========================================================================

  private checkHandleClick(pointer: { x: number; y: number }): { index: number; type: 'in' | 'out' } | null {
    for (let i = 0; i < this.pathPoints.length; i++) {
      const point = this.pathPoints[i];

      if (point.handleIn) {
        const dist = Math.hypot(pointer.x - point.handleIn.x, pointer.y - point.handleIn.y);
        if (dist < 10) {
          return { index: i, type: 'in' };
        }
      }

      if (point.handleOut) {
        const dist = Math.hypot(pointer.x - point.handleOut.x, pointer.y - point.handleOut.y);
        if (dist < 10) {
          return { index: i, type: 'out' };
        }
      }
    }

    return null;
  }

  private checkPointClick(pointer: { x: number; y: number }): number {
    for (let i = 0; i < this.pathPoints.length; i++) {
      const point = this.pathPoints[i];
      const dist = Math.hypot(pointer.x - point.x, pointer.y - point.y);
      
      if (dist < 10) {
        return i;
      }
    }

    return -1;
  }

  private checkSegmentClick(pointer: { x: number; y: number }): number {
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i];
      const p2 = this.pathPoints[i + 1];

      const dist = this.distanceToSegment(pointer, p1, p2);
      
      if (dist < 10) {
        return i; // Возвращаем индекс начальной точки сегмента
      }
    }

    return -1;
  }

  private distanceToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    
    return Math.hypot(p.x - projX, p.y - projY);
  }

  // ==========================================================================
  // OPERATIONS
  // ==========================================================================

  private breakHandles(index: number) {
    const point = this.pathPoints[index];
    
    console.log('🔨 [ConvertAnchor] Breaking handles at point', index);
    
    // Помечаем что манипуляторы сломаны (независимые)
    // В следующей версии это будет использоваться для независимого движения
    
    // Пока просто удаляем оба манипулятора
    delete point.handleIn;
    delete point.handleOut;
    
    this.visualizePath();
    this.applyChangesToPath();
  }

  private createHandlesOnSegment(segmentIndex: number, clickPoint: { x: number; y: number }) {
    console.log('✨ [ConvertAnchor] Creating handles on segment', segmentIndex);
    
    const p1 = this.pathPoints[segmentIndex];
    const p2 = this.pathPoints[segmentIndex + 1];
    
    // Находим параметр t на линии
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const l2 = dx * dx + dy * dy;
    
    let t = ((clickPoint.x - p1.x) * dx + (clickPoint.y - p1.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    
    // Создаем манипуляторы для плавной кривой
    const handleDist = Math.sqrt(l2) * 0.33; // 33% от длины сегмента
    
    // handleOut для p1
    p1.handleOut = {
      x: p1.x + dx * 0.33,
      y: p1.y + dy * 0.33
    };
    
    // handleIn для p2
    p2.handleIn = {
      x: p2.x - dx * 0.33,
      y: p2.y - dy * 0.33
    };
    
    this.visualizePath();
    this.applyChangesToPath();
  }

  private updateDraggedHandle(pointer: { x: number; y: number }) {
    if (this.draggedHandleIndex === -1 || !this.draggedHandleType) return;

    const point = this.pathPoints[this.draggedHandleIndex];
    
    if (this.draggedHandleType === 'in' && point.handleIn) {
      point.handleIn.x = pointer.x;
      point.handleIn.y = pointer.y;
      
      // Синхронизируем handleOut (симметрично)
      if (point.handleOut) {
        const dx = point.x - pointer.x;
        const dy = point.y - pointer.y;
        point.handleOut.x = point.x + dx;
        point.handleOut.y = point.y + dy;
      }
    } else if (this.draggedHandleType === 'out' && point.handleOut) {
      point.handleOut.x = pointer.x;
      point.handleOut.y = pointer.y;
      
      // Синхронизируем handleIn (симметрично)
      if (point.handleIn) {
        const dx = point.x - pointer.x;
        const dy = point.y - pointer.y;
        point.handleIn.x = point.x + dx;
        point.handleIn.y = point.y + dy;
      }
    }
    
    this.visualizePath();
  }

  // ==========================================================================
  // PATH UPDATE
  // ==========================================================================

  private applyChangesToPath() {
    if (!this.selectedPath) return;

    const pathData = this.generatePathData();
    
    // Создаем новый path
    const newPath = new fabric.Path(pathData, {
      ...this.selectedPath.toObject(),
      objectCaching: false
    });

    // Заменяем старый path
    this.canvas.remove(this.selectedPath);
    this.canvas.add(newPath);
    this.canvas.setActiveObject(newPath);
    
    this.selectedPath = newPath;
    this.canvas.renderAll();
    
    console.log('🔄 [ConvertAnchor] Path updated');
  }

  private generatePathData(): string {
    if (this.pathPoints.length === 0) return '';

    let pathData = `M ${this.pathPoints[0].x} ${this.pathPoints[0].y}`;

    for (let i = 1; i < this.pathPoints.length; i++) {
      const prevPoint = this.pathPoints[i - 1];
      const currentPoint = this.pathPoints[i];

      if (prevPoint.handleOut && currentPoint.handleIn) {
        // Cubic Bezier
        pathData += ` C ${prevPoint.handleOut.x} ${prevPoint.handleOut.y},`;
        pathData += ` ${currentPoint.handleIn.x} ${currentPoint.handleIn.y},`;
        pathData += ` ${currentPoint.x} ${currentPoint.y}`;
      } else if (prevPoint.handleOut) {
        // Quadratic Bezier
        pathData += ` Q ${prevPoint.handleOut.x} ${prevPoint.handleOut.y},`;
        pathData += ` ${currentPoint.x} ${currentPoint.y}`;
      } else {
        // Straight line
        pathData += ` L ${currentPoint.x} ${currentPoint.y}`;
      }
    }

    // Check if path was closed
    if (this.selectedPath?.path) {
      const lastCmd = this.selectedPath.path[this.selectedPath.path.length - 1];
      if (lastCmd[0] === 'Z') {
        pathData += ' Z';
      }
    }

    return pathData;
  }
}
