// @ts-nocheck
import * as fabric from 'fabric';

export class ScissorsTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private selectedPath: fabric.Path | null = null;
  private cutPoints: Array<{ x: number; y: number; t: number }> = [];
  private cutMarkers: fabric.Circle[] = [];

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

    this.clearCutMarkers();
    this.selectedPath = null;
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;
    const pointer = this.canvas.getPointer(e.e);

    // Кликнули на объект
    if (target && target.selectable) {
      let path: fabric.Path | null = null;

      // Если это Path - используем напрямую
      if (target.type === 'path') {
        path = target as fabric.Path;
      } else {
        // Конвертируем в Path
        path = this.convertToPath(target);
        if (path) {
          // Заменяем объект на путь
          this.canvas.remove(target);
          this.canvas.add(path);
          console.log('✅ Converted to path for cutting');
        }
      }

      if (!path) {
        alert('❌ Cannot convert this object to path!');
        return;
      }

      // Если это новый путь - выбираем его
      if (this.selectedPath !== path) {
        this.selectPath(path);
      }

      // Добавляем точку разреза
      this.addCutPoint(pointer, path);

      // Если есть 2 точки - разрезаем
      if (this.cutPoints.length >= 2) {
        this.cutPath();
      }
    } else if (!target) {
      // Кликнули мимо - сбрасываем выделение
      this.deselectPath();
    }
  };

  private handleMouseMove = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;

    // Меняем курсор если навели на объект
    if (target && target.selectable) {
      this.canvas.defaultCursor = 'pointer';
    } else {
      this.canvas.defaultCursor = 'crosshair';
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    // Escape - отменить выделение
    if (e.key === 'Escape') {
      this.deselectPath();
    }
  };

  private convertToPath(obj: fabric.Object): fabric.Path | null {
    try {
      let pathData = '';

      if (obj.type === 'circle') {
        const circle = obj as fabric.Circle;
        const cx = (circle.left || 0) + (circle.radius || 0);
        const cy = (circle.top || 0) + (circle.radius || 0);
        const r = (circle.radius || 0) * (circle.scaleX || 1);

        pathData = `M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} Z`;
      } else if (obj.type === 'rect') {
        const rect = obj as fabric.Rect;
        const x = rect.left || 0;
        const y = rect.top || 0;
        const w = (rect.width || 0) * (rect.scaleX || 1);
        const h = (rect.height || 0) * (rect.scaleY || 1);

        pathData = `M ${x},${y} L ${x + w},${y} L ${x + w},${y + h} L ${x},${y + h} Z`;
      } else if (obj.type === 'ellipse') {
        const ellipse = obj as fabric.Ellipse;
        const cx = (ellipse.left || 0) + (ellipse.rx || 0);
        const cy = (ellipse.top || 0) + (ellipse.ry || 0);
        const rx = (ellipse.rx || 0) * (ellipse.scaleX || 1);
        const ry = (ellipse.ry || 0) * (ellipse.scaleY || 1);

        pathData = `M ${cx - rx},${cy} A ${rx},${ry} 0 1,0 ${cx + rx},${cy} A ${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`;
      } else if (obj.type === 'polygon' || obj.type === 'polyline') {
        const poly = obj as any;
        if (poly.points && poly.points.length > 0) {
          const points = poly.points;
          const left = poly.left || 0;
          const top = poly.top || 0;
          const scaleX = poly.scaleX || 1;
          const scaleY = poly.scaleY || 1;

          pathData = `M ${left + points[0].x * scaleX},${top + points[0].y * scaleY}`;

          for (let i = 1; i < points.length; i++) {
            pathData += ` L ${left + points[i].x * scaleX},${top + points[i].y * scaleY}`;
          }

          if (obj.type === 'polygon') {
            pathData += ' Z';
          }
        }
      } else if (obj.type === 'triangle') {
        const triangle = obj as any;
        const left = triangle.left || 0;
        const top = triangle.top || 0;
        const width = (triangle.width || 0) * (triangle.scaleX || 1);
        const height = (triangle.height || 0) * (triangle.scaleY || 1);

        pathData = `M ${left + width / 2},${top} L ${left + width},${top + height} L ${left},${top + height} Z`;
      }

      if (pathData) {
        return new fabric.Path(pathData, {
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          left: obj.left,
          top: obj.top,
        });
      }

      return null;
    } catch (error) {
      console.error('Error converting to path:', error);
      return null;
    }
  }

  private selectPath(path: fabric.Path) {
    // Снимаем выделение с предыдущего
    if (this.selectedPath) {
      this.deselectPath();
    }

    this.selectedPath = path;
    this.selectedPath.set({
      stroke: '#ff6600',
      strokeWidth: 3,
    });

    this.cutPoints = [];
    this.clearCutMarkers();

    this.canvas.renderAll();
    console.log('✂️ Path selected for cutting');
  }

  private deselectPath() {
    if (this.selectedPath) {
      this.selectedPath.set({
        stroke: '#00aaff',
        strokeWidth: 2,
      });
      this.selectedPath = null;
    }

    this.cutPoints = [];
    this.clearCutMarkers();
    this.canvas.renderAll();
  }

  private addCutPoint(pointer: fabric.Point, path: fabric.Path) {
    if (!path.path) return;

    // Добавляем точку на клик
    const nearestPoint = this.findNearestPointOnPath(pointer, path);

    if (!nearestPoint) {
      console.log('❌ Point too far from path');
      return;
    }

    this.cutPoints.push(nearestPoint);

    // Визуализируем маркер
    const marker = new fabric.Circle({
      left: nearestPoint.x,
      top: nearestPoint.y,
      radius: 6,
      fill: '#ff0000',
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
    });

    this.cutMarkers.push(marker);
    this.canvas.add(marker);
    this.canvas.renderAll();

    console.log(`✂️ Cut point ${this.cutPoints.length} added:`, nearestPoint);
  }

  private findNearestPointOnPath(pointer: fabric.Point, path: fabric.Path) {
    if (!path.path) return null;

    let minDistance = Infinity;
    let nearestPoint = null;

    // Проходим по всем сегментам пути
    for (let i = 0; i < path.path.length; i++) {
      const seg = path.path[i];

      let x = 0, y = 0;

      if (seg[0] === 'M' || seg[0] === 'L') {
        x = seg[1];
        y = seg[2];
      } else if (seg[0] === 'C') {
        x = seg[5];
        y = seg[6];
      } else if (seg[0] === 'A') {
        x = seg[6];
        y = seg[7];
      }

      const distance = Math.sqrt(
          Math.pow(pointer.x - x, 2) + Math.pow(pointer.y - y, 2)
      );

      if (distance < minDistance && distance < 30) {
        minDistance = distance;
        nearestPoint = { x, y, t: i / path.path.length };
      }
    }

    return nearestPoint;
  }

  private cutPath() {
    if (!this.selectedPath || !this.selectedPath.path || this.cutPoints.length < 2) {
      return;
    }

    console.log('✂️ Cutting path with', this.cutPoints.length, 'points');

    const point1 = this.cutPoints[0];
    const point2 = this.cutPoints[1];

    // Создаем 2 новых пути
    const pathArray = this.selectedPath.path;
    const midIndex = Math.floor(pathArray.length / 2);

    // Первая часть
    let path1Data = `M ${pathArray[0][1]} ${pathArray[0][2]}`;
    for (let i = 1; i <= midIndex; i++) {
      const seg = pathArray[i];
      if (seg[0] === 'L') {
        path1Data += ` L ${seg[1]} ${seg[2]}`;
      } else if (seg[0] === 'C') {
        path1Data += ` C ${seg[1]} ${seg[2]}, ${seg[3]} ${seg[4]}, ${seg[5]} ${seg[6]}`;
      } else if (seg[0] === 'A') {
        path1Data += ` A ${seg[1]} ${seg[2]} ${seg[3]} ${seg[4]} ${seg[5]} ${seg[6]} ${seg[7]}`;
      }
    }

    // Вторая часть
    let path2Data = `M ${point1.x} ${point1.y}`;
    for (let i = midIndex + 1; i < pathArray.length; i++) {
      const seg = pathArray[i];
      if (seg[0] === 'L') {
        path2Data += ` L ${seg[1]} ${seg[2]}`;
      } else if (seg[0] === 'C') {
        path2Data += ` C ${seg[1]} ${seg[2]}, ${seg[3]} ${seg[4]}, ${seg[5]} ${seg[6]}`;
      } else if (seg[0] === 'A') {
        path2Data += ` A ${seg[1]} ${seg[2]} ${seg[3]} ${seg[4]} ${seg[5]} ${seg[6]} ${seg[7]}`;
      } else if (seg[0] === 'Z') {
        // Не замыкаем
      }
    }

    const newPath1 = new fabric.Path(path1Data, {
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
      selectable: true,
      evented: true,
    });

    const newPath2 = new fabric.Path(path2Data, {
      fill: 'transparent',
      stroke: '#00aaff',
      strokeWidth: 2,
      selectable: true,
      evented: true,
    });

    // Удаляем оригинал
    this.canvas.remove(this.selectedPath);

    // Добавляем новые
    this.canvas.add(newPath1);
    this.canvas.add(newPath2);

    this.deselectPath();
    this.canvas.renderAll();

    console.log('✅ Path cut successfully!');
    alert('✂️ Path cut into 2 parts!');
  }

  private clearCutMarkers() {
    this.cutMarkers.forEach(marker => this.canvas.remove(marker));
    this.cutMarkers = [];
  }
}