import * as fabric from 'fabric';

export class FabricTools {
  /**
   * Инициализирует canvas с базовыми настройками
   */
  static initCanvas(canvasElement: HTMLCanvasElement) {
    const canvas = new fabric.Canvas(canvasElement, {
      width: 1000,
      height: 1000,
      backgroundColor: '#1e1e1e',
      selection: true,
      preserveObjectStacking: true,
    });

    canvas.renderOnAddRemove = true;
    return canvas;
  }

  /**
   * Рисует guidelines (baseline, ascender, descender)
   */
  static drawGuidelines(canvas: fabric.Canvas) {
    const guidelines: fabric.Line[] = [];

    const baseline = new fabric.Line([0, 500, 1000, 500], {
      stroke: '#ff0000',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    guidelines.push(baseline);

    const ascender = new fabric.Line([0, 100, 1000, 100], {
      stroke: '#00ff00',
      strokeWidth: 1,
      selectable: false,
      evented: false,
    });
    guidelines.push(ascender);

    const descender = new fabric.Line([0, 700, 1000, 700], {
      stroke: '#0000ff',
      strokeWidth: 1,
      selectable: false,
      evented: false,
    });
    guidelines.push(descender);

    const capHeight = new fabric.Line([0, 200, 1000, 200], {
      stroke: '#666666',
      strokeWidth: 1,
      strokeDashArray: [10, 5],
      selectable: false,
      evented: false,
    });
    guidelines.push(capHeight);

    const xHeight = new fabric.Line([0, 300, 1000, 300], {
      stroke: '#666666',
      strokeWidth: 1,
      strokeDashArray: [10, 5],
      selectable: false,
      evented: false,
    });
    guidelines.push(xHeight);

    const centerLine = new fabric.Line([500, 0, 500, 1000], {
      stroke: '#666666',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    guidelines.push(centerLine);

    guidelines.forEach((line) => canvas.add(line));
    return guidelines;
  }

  /**
   * Рисует сетку
   */
  static drawGrid(canvas: fabric.Canvas, gridSize: number = 50) {
    const grid: fabric.Line[] = [];
    const width = canvas.width || 1000;
    const height = canvas.height || 1000;

    for (let x = 0; x <= width; x += gridSize) {
      const line = new fabric.Line([x, 0, x, height], {
        stroke: '#2a2a2a',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      });
      grid.push(line);
      canvas.add(line);
    }

    for (let y = 0; y <= height; y += gridSize) {
      const line = new fabric.Line([0, y, width, y], {
        stroke: '#2a2a2a',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      });
      grid.push(line);
      canvas.add(line);
    }

    return grid;
  }

  /**
   * Активирует режим рисования
   */
  static enableDrawingMode(canvas: fabric.Canvas) {
    canvas.isDrawingMode = true;
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = '#00aaff';
      canvas.freeDrawingBrush.width = 2;
    }
  }

  /**
   * Отключает режим рисования
   */
  static disableDrawingMode(canvas: fabric.Canvas) {
    canvas.isDrawingMode = false;
  }

  /**
   * Добавляет круг
   */
  static addCircle(canvas: fabric.Canvas, x: number = 300, y: number = 300) {
    const circle = new fabric.Circle({
      left: x,
      top: y,
      radius: 100,
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    return circle;
  }

  /**
   * Добавляет прямоугольник
   */
  static addRectangle(canvas: fabric.Canvas, x: number = 300, y: number = 300) {
    const rect = new fabric.Rect({
      left: x,
      top: y,
      width: 200,
      height: 200,
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    return rect;
  }

  /**
   * Добавляет треугольник
   */
  static addTriangle(canvas: fabric.Canvas, x: number = 300, y: number = 300) {
    const triangle = new fabric.Triangle({
      left: x,
      top: y,
      width: 200,
      height: 200,
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
    });
    canvas.add(triangle);
    canvas.setActiveObject(triangle);
    return triangle;
  }

  /**
   * Добавляет звезду
   */
  static addStar(canvas: fabric.Canvas, x: number = 400, y: number = 400) {
    const points = 5;
    const outerRadius = 100;
    const innerRadius = 50;
    const starPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points;
      starPoints.push({
        x: x + radius * Math.sin(angle),
        y: y - radius * Math.cos(angle),
      });
    }

    const polygon = new fabric.Polygon(starPoints, {
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
    });

    canvas.add(polygon);
    canvas.setActiveObject(polygon);
    return polygon;
  }

  /**
   * Добавляет многоугольник
   */
  static addPolygon(canvas: fabric.Canvas, sides: number = 6, x: number = 400, y: number = 400) {
    const radius = 100;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides;
      points.push({
        x: x + radius * Math.cos(angle),
        y: y + radius * Math.sin(angle),
      });
    }

    const polygon = new fabric.Polygon(points, {
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
    });

    canvas.add(polygon);
    canvas.setActiveObject(polygon);
    return polygon;
  }

  /**
   * Добавляет эллипс
   */
  static addEllipse(canvas: fabric.Canvas, x: number = 300, y: number = 300) {
    const ellipse = new fabric.Ellipse({
      left: x,
      top: y,
      rx: 150,
      ry: 80,
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
    });

    canvas.add(ellipse);
    canvas.setActiveObject(ellipse);
    return ellipse;
  }

  /**
   * Добавляет линию
   */
  static addLine(canvas: fabric.Canvas, x: number = 200, y: number = 300) {
    const line = new fabric.Line([x, y, x + 200, y], {
      stroke: '#00aaff',
      strokeWidth: 2,
    });

    canvas.add(line);
    canvas.setActiveObject(line);
    return line;
  }

  /**
   * Удаляет выбранный объект
   */
  static deleteSelected(canvas: fabric.Canvas) {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach((obj) => {
        if ((obj as any).editPoints) {
          (obj as any).editPoints.forEach((p: fabric.Circle) => canvas.remove(p));
        }
        canvas.remove(obj);
      });
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }

  /**
   * Очищает canvas (кроме guidelines и grid)
   */
  static clearCanvas(canvas: fabric.Canvas) {
    const objects = canvas.getObjects();
    const toRemove = objects.filter((obj) => {
      return obj.selectable !== false;
    });
    toRemove.forEach((obj) => canvas.remove(obj));
    canvas.renderAll();
  }

  /**
   * Конвертирует фигуру в path и включает редактирование точек
   */
  static convertToPath(canvas: fabric.Canvas, obj: fabric.Object) {
    let pathData = '';

    if (obj.type === 'circle') {
      const circle = obj as fabric.Circle;
      const radius = circle.radius || 50;
      const left = circle.left || 0;
      const top = circle.top || 0;
      const cx = left + radius;
      const cy = top + radius;

      const segments = 8;
      const points: string[] = [];

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) {
          points.push(`M ${x},${y}`);
        } else {
          points.push(`L ${x},${y}`);
        }
      }
      points.push('Z');
      pathData = points.join(' ');

    } else if (obj.type === 'rect') {
      const rect = obj as fabric.Rect;
      const x = rect.left || 0;
      const y = rect.top || 0;
      const w = rect.width || 100;
      const h = rect.height || 100;

      pathData = `M ${x},${y} L ${x + w},${y} L ${x + w},${y + h} L ${x},${y + h} Z`;

    } else if (obj.type === 'triangle') {
      const tri = obj as fabric.Triangle;
      const x = tri.left || 0;
      const y = tri.top || 0;
      const w = tri.width || 100;
      const h = tri.height || 100;

      pathData = `M ${x + w / 2},${y} L ${x + w},${y + h} L ${x},${y + h} Z`;

    } else if (obj.type === 'polygon') {
      const poly = obj as fabric.Polygon;
      if (poly.points && poly.points.length > 0) {
        const firstPoint = poly.points[0];
        pathData = `M ${firstPoint.x},${firstPoint.y}`;

        for (let i = 1; i < poly.points.length; i++) {
          pathData += ` L ${poly.points[i].x},${poly.points[i].y}`;
        }
        pathData += ' Z';
      }
    }

    if (pathData) {
      const path = new fabric.Path(pathData, {
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth,
        left: 0,
        top: 0,
        objectCaching: false,
        hasBorders: true,
        hasControls: true,
      });

      canvas.remove(obj);
      canvas.add(path);
      canvas.setActiveObject(path);

      this.enablePathEditing(path, canvas);

      canvas.renderAll();
      return path;
    }

    return null;
  }

  /**
   * Включает редактирование точек с визуальными маркерами
   */
  static enablePathEditing(path: fabric.Path, canvas: fabric.Canvas) {
    if (!path.path) return;

    const points: fabric.Circle[] = [];

    path.path.forEach((segment: any, index: number) => {
      if (segment[0] === 'M' || segment[0] === 'L') {
        const x = segment[1];
        const y = segment[2];

        const point = new fabric.Circle({
          left: x - 5,
          top: y - 5,
          radius: 5,
          fill: '#00aaff',
          stroke: '#ffffff',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
          hasBorders: false,
          hasControls: false,
          selectable: true,
        });

        (point as any).pathIndex = index;
        (point as any).originalPath = path;

        point.on('moving', function() {
          const pointObj = this as fabric.Circle;
          const pathObj = (pointObj as any).originalPath as fabric.Path;
          const idx = (pointObj as any).pathIndex;

          if (pathObj.path && pathObj.path[idx]) {
            pathObj.path[idx][1] = (pointObj.left || 0) + 5;
            pathObj.path[idx][2] = (pointObj.top || 0) + 5;
            pathObj.dirty = true;
            canvas.renderAll();
          }
        });

        points.push(point);
        canvas.add(point);
      }
    });

    (path as any).editPoints = points;
  }

  /**
   * Удаляет точки редактирования
   */
  static disablePathEditing(path: fabric.Path, canvas: fabric.Canvas) {
    if ((path as any).editPoints) {
      (path as any).editPoints.forEach((p: fabric.Circle) => canvas.remove(p));
      (path as any).editPoints = null;
    }
  }

  /**
   * Добавляет точку на путь
   */
  static addPointToPath(path: fabric.Path, canvas: fabric.Canvas, x: number, y: number) {
    if (!path.path) return;

    let closestSegmentIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < path.path.length - 1; i++) {
      const seg1 = path.path[i];
      const seg2 = path.path[i + 1];

      if ((seg1[0] === 'M' || seg1[0] === 'L') && (seg2[0] === 'L')) {
        const x1 = seg1[1];
        const y1 = seg1[2];
        const x2 = seg2[1];
        const y2 = seg2[2];

        const distance = this.pointToLineDistance(x, y, x1, y1, x2, y2);

        if (distance < minDistance) {
          minDistance = distance;
          closestSegmentIndex = i;
        }
      }
    }

    path.path.splice(closestSegmentIndex + 1, 0, ['L', x, y]);
    path.dirty = true;

    this.disablePathEditing(path, canvas);
    this.enablePathEditing(path, canvas);

    canvas.renderAll();
  }

  /**
   * Удаляет точку с пути
   */
  static removePointFromPath(path: fabric.Path, canvas: fabric.Canvas, pointIndex: number) {
    if (!path.path || path.path.length <= 3) return;

    path.path.splice(pointIndex, 1);
    path.dirty = true;

    this.disablePathEditing(path, canvas);
    this.enablePathEditing(path, canvas);

    canvas.renderAll();
  }

  /**
   * Скругляет углы пути
   */
  static roundPathCorners(path: fabric.Path, canvas: fabric.Canvas) {
    if (!path.path) return;

    const newPath: any[] = [];

    for (let i = 0; i < path.path.length; i++) {
      const segment = path.path[i];

      if (segment[0] === 'L' && i > 0 && i < path.path.length - 1) {
        const prev = path.path[i - 1];
        const next = path.path[i + 1];

        if ((prev[0] === 'M' || prev[0] === 'L') && (next[0] === 'L' || next[0] === 'Z')) {
          const x = segment[1];
          const y = segment[2];
          newPath.push(['Q', x, y, x, y]);
        } else {
          newPath.push(segment);
        }
      } else {
        newPath.push(segment);
      }
    }

    path.path = newPath;
    path.dirty = true;
    canvas.renderAll();
  }

  /**
   * Делает углы острыми
   */
  static sharpenPathCorners(path: fabric.Path, canvas: fabric.Canvas) {
    if (!path.path) return;

    const newPath: any[] = [];

    for (let i = 0; i < path.path.length; i++) {
      const segment = path.path[i];

      if (segment[0] === 'Q') {
        newPath.push(['L', segment[3], segment[4]]);
      } else if (segment[0] === 'C') {
        newPath.push(['L', segment[5], segment[6]]);
      } else {
        newPath.push(segment);
      }
    }

    path.path = newPath;
    path.dirty = true;
    canvas.renderAll();
  }

  /**
   * Расстояние от точки до линии
   */
  static pointToLineDistance(
      px: number,
      py: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number
  ): number {
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

    const dx = px - xx;
    const dy = py - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }
}