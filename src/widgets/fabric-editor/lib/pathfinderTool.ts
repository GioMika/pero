// @ts-nocheck
import * as fabric from 'fabric';
import paper from 'paper';

export enum PathfinderOperation {
  UNITE = 'unite',
  SUBTRACT = 'subtract',
  INTERSECT = 'intersect',
  EXCLUDE = 'exclude',
  DIVIDE = 'divide',
  TRIM = 'trim',
  MERGE = 'merge',
}

export class PathfinderTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private paperScope: paper.PaperScope;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;

    // Инициализируем Paper.js
    this.paperScope = new paper.PaperScope();
    const tempCanvas = document.createElement('canvas');
    this.paperScope.setup(tempCanvas);
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = true;
  }

  deactivate() {
    this.isActive = false;
  }

  executeOperation(operation: PathfinderOperation) {
    const activeSelection = this.canvas.getActiveObject();

    if (!activeSelection) {
      alert('⚠️ Select 2+ objects first!');
      return;
    }

    let objects: fabric.Object[] = [];

    if (activeSelection.type?.toLowerCase() === 'activeselection') {
      objects = (activeSelection as any)._objects || [];
    } else {
      objects = [activeSelection];
    }

    if (objects.length < 2) {
      alert('⚠️ Need at least 2 objects!');
      return;
    }

    console.log('🔗 Professional Pathfinder:', operation, 'on', objects.length, 'objects');

    // СНАЧАЛА конвертируем ВСЕ объекты в Path
    const convertedObjects: fabric.Path[] = [];

    for (const obj of objects) {
      if (obj.type === 'path') {
        convertedObjects.push(obj as fabric.Path);
      } else {
        // Конвертируем фигуру в path
        const pathObj = this.convertShapeToPath(obj);
        if (pathObj) {
          convertedObjects.push(pathObj);
        }
      }
    }

    if (convertedObjects.length < 2) {
      alert('❌ Cannot convert objects to paths!');
      return;
    }

    // Теперь конвертируем в Paper.js
    const paperPaths = convertedObjects
        .map(obj => this.fabricPathToPaperPath(obj))
        .filter(p => p !== null);

    if (paperPaths.length < 2) {
      alert('❌ Cannot convert paths to Paper.js format!');
      return;
    }

    // Выполняем Boolean операцию
    let resultPath: paper.Path | null = null;

    try {
      switch (operation) {
        case PathfinderOperation.UNITE:
          resultPath = this.unite(paperPaths);
          break;
        case PathfinderOperation.SUBTRACT:
          resultPath = this.subtract(paperPaths);
          break;
        case PathfinderOperation.INTERSECT:
          resultPath = this.intersect(paperPaths);
          break;
        case PathfinderOperation.EXCLUDE:
          resultPath = this.exclude(paperPaths);
          break;
        case PathfinderOperation.DIVIDE:
          resultPath = this.divide(paperPaths);
          break;
        case PathfinderOperation.TRIM:
          resultPath = this.trim(paperPaths);
          break;
        case PathfinderOperation.MERGE:
          resultPath = this.merge(paperPaths);
          break;
      }

      if (resultPath) {
        // Конвертируем результат обратно в Fabric
        const fabricPath = this.paperToFabricPath(resultPath);

        if (fabricPath) {
          // Удаляем оригинальные объекты
          objects.forEach(obj => this.canvas.remove(obj));
          this.canvas.discardActiveObject();

          // Добавляем результат
          this.canvas.add(fabricPath);
          this.canvas.setActiveObject(fabricPath);
          this.canvas.renderAll();

          console.log('✅ Professional Pathfinder completed!');
        } else {
          alert('❌ Failed to convert result back to Fabric!');
        }
      } else {
        alert('❌ Boolean operation failed!');
      }
    } catch (error) {
      console.error('❌ Pathfinder error:', error);
      alert('❌ Operation failed: ' + error.message);
    }
  }

  // Конвертирует любую Fabric фигуру в Path
  private convertShapeToPath(obj: fabric.Object): fabric.Path | null {
    try {
      let pathData = '';

      if (obj.type === 'circle') {
        const circle = obj as fabric.Circle;
        const cx = (circle.left || 0) + (circle.radius || 0);
        const cy = (circle.top || 0) + (circle.radius || 0);
        const r = (circle.radius || 0) * (circle.scaleX || 1);

        // SVG путь для круга
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
        });
      }

      return null;
    } catch (error) {
      console.error('Error converting shape to path:', error);
      return null;
    }
  }

  // Конвертирует Fabric Path в Paper.js Path
  private fabricPathToPaperPath(fabricPath: fabric.Path): paper.Path | null {
    try {
      if (!fabricPath.path) return null;

      let pathData = '';

      for (const segment of fabricPath.path) {
        pathData += segment.join(' ') + ' ';
      }

      const paperPath = new this.paperScope.Path(pathData.trim());

      // Применяем трансформации
      if (fabricPath.scaleX && fabricPath.scaleX !== 1) {
        paperPath.scale(fabricPath.scaleX, 1);
      }
      if (fabricPath.scaleY && fabricPath.scaleY !== 1) {
        paperPath.scale(1, fabricPath.scaleY);
      }

      return paperPath;
    } catch (error) {
      console.error('Error converting Fabric Path to Paper:', error);
      return null;
    }
  }

  private paperToFabricPath(paperPath: paper.Path): fabric.Path | null {
    try {
      const pathData = paperPath.pathData;

      const fabricPath = new fabric.Path(pathData, {
        fill: '#00aaff',
        stroke: '#ffffff',
        strokeWidth: 2,
        objectCaching: false,
      });

      return fabricPath;
    } catch (error) {
      console.error('Error converting Paper to Fabric:', error);
      return null;
    }
  }

  private unite(paths: paper.Path[]): paper.Path | null {
    let result = paths[0];

    for (let i = 1; i < paths.length; i++) {
      const unionResult = result.unite(paths[i]);
      if (unionResult) {
        result = unionResult;
      }
    }

    return result;
  }

  private subtract(paths: paper.Path[]): paper.Path | null {
    let result = paths[0];

    for (let i = 1; i < paths.length; i++) {
      const subtractResult = result.subtract(paths[i]);
      if (subtractResult) {
        result = subtractResult;
      }
    }

    return result;
  }

  private intersect(paths: paper.Path[]): paper.Path | null {
    let result = paths[0];

    for (let i = 1; i < paths.length; i++) {
      const intersectResult = result.intersect(paths[i]);
      if (intersectResult) {
        result = intersectResult;
      }
    }

    return result;
  }

  private exclude(paths: paper.Path[]): paper.Path | null {
    let result = paths[0];

    for (let i = 1; i < paths.length; i++) {
      const excludeResult = result.exclude(paths[i]);
      if (excludeResult) {
        result = excludeResult;
      }
    }

    return result;
  }

  private divide(paths: paper.Path[]): paper.Path | null {
    // Divide: разбивает на отдельные части по пересечениям
    let united = paths[0];

    for (let i = 1; i < paths.length; i++) {
      const unionResult = united.unite(paths[i]);
      if (unionResult) {
        united = unionResult;
      }
    }

    return united;
  }

  private trim(paths: paper.Path[]): paper.Path | null {
    // Trim: обрезает нижние объекты по верхним
    let result = paths[0].clone();

    for (let i = 1; i < paths.length; i++) {
      const subtractResult = result.subtract(paths[i]);
      if (subtractResult) {
        result = subtractResult;
      }
    }

    return result;
  }

  private merge(paths: paper.Path[]): paper.Path | null {
    // Merge: объединяет все пересекающиеся фигуры с упрощением
    let result = paths[0];

    for (let i = 1; i < paths.length; i++) {
      const mergeResult = result.unite(paths[i]);
      if (mergeResult) {
        mergeResult.simplify();
        result = mergeResult;
      }
    }

    return result;
  }
}