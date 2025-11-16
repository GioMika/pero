// @ts-nocheck
import * as fabric from 'fabric';

/**
 * Simplify Tool - Упрощение путей (удаление лишних точек)
 * 
 * Алгоритм Ramer-Douglas-Peucker
 */
export class SimplifyTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private selectedPath: fabric.Path | null = null;
  private tolerance: number = 2.0;
  private originalPointCount: number = 0;

  constructor(canvas: fabric.Canvas, tolerance: number = 2.0) {
    this.canvas = canvas;
    this.tolerance = tolerance;
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'pointer';

    this.canvas.on('mouse:down', this.handleMouseDown);
    this.canvas.on('mouse:over', this.handleMouseOver);
    this.canvas.on('mouse:out', this.handleMouseOut);

    document.addEventListener('keydown', this.handleKeyDown);

    console.log('✅ [SimplifyTool] Activated, tolerance:', this.tolerance);
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:over', this.handleMouseOver);
    this.canvas.off('mouse:out', this.handleMouseOut);

    document.removeEventListener('keydown', this.handleKeyDown);

    if (this.selectedPath) {
      this.selectedPath.set({ stroke: '#3B82F6', strokeWidth: 2 });
      this.selectedPath = null;
    }

    this.canvas.renderAll();
    console.log('🔴 [SimplifyTool] Deactivated');
  }

  public setTolerance(tolerance: number) {
    this.tolerance = Math.max(0.1, tolerance);
    console.log('🎚️ [SimplifyTool] Tolerance:', this.tolerance);
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;
    if (target && target.type === 'path') {
      this.selectAndSimplifyPath(target as fabric.Path);
    }
  };

  private handleMouseOver = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;
    if (target && target.type === 'path' && target !== this.selectedPath) {
      target.set({ stroke: '#8B5CF6', strokeWidth: 3 });
      this.canvas.renderAll();
    }
  };

  private handleMouseOut = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;
    if (target && target.type === 'path' && target !== this.selectedPath) {
      target.set({ stroke: '#3B82F6', strokeWidth: 2 });
      this.canvas.renderAll();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    if ((e.key === 's' || e.key === 'S') && this.selectedPath) {
      this.simplifyPath(this.selectedPath);
      e.preventDefault();
    }

    if (e.key === 'a' || e.key === 'A') {
      this.simplifyAllPaths();
      e.preventDefault();
    }

    if (e.key === '+' || e.key === '=') {
      this.setTolerance(this.tolerance + 0.5);
      e.preventDefault();
    }

    if (e.key === '-' || e.key === '_') {
      this.setTolerance(this.tolerance - 0.5);
      e.preventDefault();
    }
  };

  private selectAndSimplifyPath(path: fabric.Path) {
    if (this.selectedPath) {
      this.selectedPath.set({ stroke: '#3B82F6', strokeWidth: 2 });
    }

    this.selectedPath = path;
    this.selectedPath.set({ stroke: '#10B981', strokeWidth: 3 });
    
    this.simplifyPath(path);
    this.canvas.renderAll();
  }

  private simplifyPath(path: fabric.Path) {
    if (!path.path || path.path.length < 3) return;

    this.originalPointCount = path.path.length;
    const points = this.pathToPoints(path.path);
    
    if (points.length < 3) return;

    const simplified = this.ramerDouglasPeucker(points, this.tolerance);
    const newPath = this.pointsToPath(simplified);

    path.path = newPath;
    path.dirty = true;
    this.canvas.renderAll();

    const removed = this.originalPointCount - path.path.length;
    console.log(`✨ [SimplifyTool] ${this.originalPointCount} → ${path.path.length} (-${removed})`);
  }

  private simplifyAllPaths() {
    const paths = this.canvas.getObjects().filter(obj => obj.type === 'path' && obj.selectable);
    
    paths.forEach((pathObj: any) => {
      const path = pathObj as fabric.Path;
      if (path.path && path.path.length >= 3) {
        this.simplifyPath(path);
      }
    });

    console.log(`✨ [SimplifyTool] Simplified ${paths.length} paths`);
  }

  private pathToPoints(pathArray: any[]): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];

    pathArray.forEach(segment => {
      if (segment[0] === 'M' || segment[0] === 'L') {
        points.push({ x: segment[1], y: segment[2] });
      } else if (segment[0] === 'C') {
        points.push({ x: segment[5], y: segment[6] });
      }
    });

    return points;
  }

  private pointsToPath(points: Array<{ x: number; y: number }>): any[] {
    if (points.length === 0) return [];

    const pathArray: any[] = [['M', points[0].x, points[0].y]];

    for (let i = 1; i < points.length; i++) {
      pathArray.push(['L', points[i].x, points[i].y]);
    }

    const first = points[0];
    const last = points[points.length - 1];
    const distance = Math.sqrt(Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2));
    
    if (distance < 1) {
      pathArray.push(['Z']);
    }

    return pathArray;
  }

  private ramerDouglasPeucker(
    points: Array<{ x: number; y: number }>, 
    tolerance: number
  ): Array<{ x: number; y: number }> {
    if (points.length <= 2) return points;

    let maxDistance = 0;
    let maxIndex = 0;
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], firstPoint, lastPoint);

      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > tolerance) {
      const leftSegment = this.ramerDouglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const rightSegment = this.ramerDouglasPeucker(points.slice(maxIndex), tolerance);
      return leftSegment.slice(0, -1).concat(rightSegment);
    } else {
      return [firstPoint, lastPoint];
    }
  }

  private perpendicularDistance(
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    
    if (mag === 0) {
      return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));
    }

    const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (mag * mag);

    let closestPoint: { x: number; y: number };

    if (u < 0) {
      closestPoint = lineStart;
    } else if (u > 1) {
      closestPoint = lineEnd;
    } else {
      closestPoint = {
        x: lineStart.x + u * dx,
        y: lineStart.y + u * dy,
      };
    }

    return Math.sqrt(Math.pow(point.x - closestPoint.x, 2) + Math.pow(point.y - closestPoint.y, 2));
  }
}
