// @ts-nocheck
import * as fabric from 'fabric';

/**
 * Join Tool - Соединение разорванных путей
 * 
 * Функции:
 * - Автоопределение открытых концов
 * - Визуальная подсветка конечных точек
 * - Умное соединение ближайших концов
 * - Автовыравнивание при соединении
 * - Объединение перекрывающихся путей
 * - Закрытие открытых контуров
 */
export class JoinTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private openEnds: Array<{
    path: fabric.Path;
    segmentIndex: number;
    x: number;
    y: number;
    marker: fabric.Circle;
  }> = [];
  private selectedEnds: Array<{
    path: fabric.Path;
    segmentIndex: number;
    x: number;
    y: number;
  }> = [];
  private threshold: number = 10; // Порог близости для автосоединения (в пикселях)

  constructor(canvas: fabric.Canvas, threshold: number = 10) {
    this.canvas = canvas;
    this.threshold = threshold;
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'pointer';

    this.canvas.on('mouse:down', this.handleMouseDown);
    this.canvas.on('mouse:over', this.handleMouseOver);
    this.canvas.on('mouse:out', this.handleMouseOut);

    document.addEventListener('keydown', this.handleKeyDown);

    // Находим и подсвечиваем все открытые концы
    this.findAndHighlightOpenEnds();

    console.log('✅ [JoinTool] Activated, found', this.openEnds.length, 'open ends');
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:over', this.handleMouseOver);
    this.canvas.off('mouse:out', this.handleMouseOut);

    document.removeEventListener('keydown', this.handleKeyDown);

    this.clearMarkers();
    this.selectedEnds = [];

    console.log('🔴 [JoinTool] Deactivated');
  }

  /**
   * Установить порог близости
   */
  public setThreshold(threshold: number) {
    this.threshold = Math.max(1, threshold);
    console.log('📏 [JoinTool] Threshold set to:', this.threshold);
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;

    // Клик на маркер конца пути
    if (target && (target as any).isJoinMarker) {
      const endInfo = (target as any).endInfo;
      this.selectEnd(endInfo, target as fabric.Circle);
    }
  };

  private handleMouseOver = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;
    if (target && (target as any).isJoinMarker) {
      target.set({ 
        radius: 8, 
        strokeWidth: 3,
        shadow: new fabric.Shadow({
          color: 'rgba(239, 68, 68, 0.5)',
          blur: 10,
        })
      });
      this.canvas.renderAll();
    }
  };

  private handleMouseOut = (e: any) => {
    if (!this.isActive) return;

    const target = e.target;
    if (target && (target as any).isJoinMarker) {
      const isSelected = (target as any).isSelected;
      target.set({ 
        radius: isSelected ? 7 : 6,
        strokeWidth: 2,
        shadow: null,
      });
      this.canvas.renderAll();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    // J = Join Nearest (соединить ближайшие)
    if (e.key === 'j' || e.key === 'J' || e.key === 'о' || e.key === 'О') {
      this.joinNearestEnds();
      e.preventDefault();
    }

    // C = Close All (закрыть все открытые контуры)
    if (e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') {
      this.closeAllPaths();
      e.preventDefault();
    }

    // Escape = Отменить выделение
    if (e.key === 'Escape') {
      this.clearSelection();
    }
  };

  /**
   * Найти и подсветить все открытые концы путей
   */
  private findAndHighlightOpenEnds() {
    this.clearMarkers();

    const paths = this.canvas.getObjects().filter(obj => obj.type === 'path' && obj.selectable);

    paths.forEach((pathObj: any) => {
      const path = pathObj as fabric.Path;
      if (!path.path || path.path.length < 2) return;

      // Проверяем закрыт ли путь
      const lastSegment = path.path[path.path.length - 1];
      const isClosed = lastSegment[0] === 'Z';

      if (!isClosed) {
        // Начальная точка (M)
        const firstSegment = path.path[0];
        if (firstSegment[0] === 'M') {
          const startX = firstSegment[1];
          const startY = firstSegment[2];
          this.createEndMarker(path, 0, startX, startY, 'start');
        }

        // Конечная точка
        const endSegment = path.path[path.path.length - 1];
        const endX = endSegment[endSegment.length - 2];
        const endY = endSegment[endSegment.length - 1];
        this.createEndMarker(path, path.path.length - 1, endX, endY, 'end');
      }
    });

    this.canvas.renderAll();
    console.log('🔍 [JoinTool] Found', this.openEnds.length, 'open ends');
  }

  /**
   * Создать маркер для конца пути
   */
  private createEndMarker(path: fabric.Path, segmentIndex: number, x: number, y: number, type: 'start' | 'end') {
    const marker = new fabric.Circle({
      left: x,
      top: y,
      radius: 6,
      fill: '#EF4444', // Красный
      stroke: '#ffffff',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      hasBorders: false,
      hasControls: false,
      selectable: true,
      hoverCursor: 'pointer',
    });

    (marker as any).isJoinMarker = true;
    (marker as any).endInfo = {
      path,
      segmentIndex,
      x,
      y,
      type,
    };

    this.canvas.add(marker);
    this.openEnds.push({
      path,
      segmentIndex,
      x,
      y,
      marker,
    });
  }

  /**
   * Выбрать конец пути
   */
  private selectEnd(endInfo: any, marker: fabric.Circle) {
    // Если уже выбрано 2 конца - сбрасываем
    if (this.selectedEnds.length >= 2) {
      this.clearSelection();
    }

    // Добавляем в выбранные
    this.selectedEnds.push(endInfo);
    
    // Меняем цвет маркера
    marker.set({
      fill: '#10B981', // Зеленый
      radius: 7,
    });
    (marker as any).isSelected = true;

    this.canvas.renderAll();

    console.log('✅ [JoinTool] End selected:', endInfo.type, 'at', endInfo.x, endInfo.y);

    // Если выбрано 2 конца - соединяем
    if (this.selectedEnds.length === 2) {
      this.joinSelectedEnds();
    }
  }

  /**
   * Соединить выбранные концы
   */
  private joinSelectedEnds() {
    if (this.selectedEnds.length !== 2) return;

    const end1 = this.selectedEnds[0];
    const end2 = this.selectedEnds[1];

    console.log('🔗 [JoinTool] Joining ends:', end1.type, '→', end2.type);

    // Если это один и тот же путь - просто закрываем его
    if (end1.path === end2.path) {
      this.closePath(end1.path);
    } else {
      // Соединяем два разных пути
      this.mergePaths(end1, end2);
    }

    // Обновляем маркеры
    this.findAndHighlightOpenEnds();
    this.clearSelection();
  }

  /**
   * Закрыть путь (добавить Z)
   */
  private closePath(path: fabric.Path) {
    if (!path.path) return;

    // Добавляем Z в конец если его нет
    const lastSegment = path.path[path.path.length - 1];
    if (lastSegment[0] !== 'Z') {
      path.path.push(['Z']);
      path.dirty = true;
      this.canvas.renderAll();
      console.log('✅ [JoinTool] Path closed');
    }
  }

  /**
   * Объединить два пути в один
   */
  private mergePaths(end1: any, end2: any) {
    const path1 = end1.path;
    const path2 = end2.path;

    if (!path1.path || !path2.path) return;

    // Создаем новый объединенный путь
    let newPathData: any[] = [];

    // Если конец первого пути соединяется с началом второго
    if (end1.type === 'end' && end2.type === 'start') {
      newPathData = [...path1.path];
      // Удаляем M из второго пути и добавляем остальное
      newPathData.push(...path2.path.slice(1));
    }
    // Если конец второго пути соединяется с началом первого
    else if (end2.type === 'end' && end1.type === 'start') {
      newPathData = [...path2.path];
      newPathData.push(...path1.path.slice(1));
    }
    // Если оба конца - надо перевернуть один из путей
    else if (end1.type === 'end' && end2.type === 'end') {
      newPathData = [...path1.path];
      const reversedPath2 = this.reversePath(path2.path);
      newPathData.push(...reversedPath2.slice(1));
    }
    // Если оба начала - надо перевернуть первый путь
    else if (end1.type === 'start' && end2.type === 'start') {
      const reversedPath1 = this.reversePath(path1.path);
      newPathData = [...reversedPath1];
      newPathData.push(...path2.path.slice(1));
    }

    // Создаем новый путь
    const newPath = new fabric.Path(this.pathArrayToString(newPathData), {
      fill: 'transparent',
      stroke: '#3B82F6',
      strokeWidth: 2,
      objectCaching: false,
      hasBorders: true,
      hasControls: true,
      selectable: true,
      evented: true,
      perPixelTargetFind: true,
    });

    // Удаляем старые пути
    this.canvas.remove(path1);
    this.canvas.remove(path2);

    // Добавляем новый
    this.canvas.add(newPath);
    this.canvas.renderAll();

    console.log('✅ [JoinTool] Paths merged');
  }

  /**
   * Перевернуть путь (reverse)
   */
  private reversePath(pathArray: any[]): any[] {
    const reversed: any[] = [];
    
    for (let i = pathArray.length - 1; i >= 0; i--) {
      const segment = pathArray[i];
      
      if (segment[0] === 'M' && i === 0) {
        // Первая точка становится последней
        const x = segment[1];
        const y = segment[2];
        reversed.push(['L', x, y]);
      } else if (segment[0] === 'L') {
        const x = segment[1];
        const y = segment[2];
        if (reversed.length === 0) {
          reversed.push(['M', x, y]);
        } else {
          reversed.push(['L', x, y]);
        }
      } else if (segment[0] === 'C') {
        // Для кривых Безье меняем порядок контрольных точек
        const x = segment[5];
        const y = segment[6];
        const cp1x = segment[3];
        const cp1y = segment[4];
        const cp2x = segment[1];
        const cp2y = segment[2];
        
        if (reversed.length === 0) {
          reversed.push(['M', x, y]);
        } else {
          reversed.push(['C', cp1x, cp1y, cp2x, cp2y, x, y]);
        }
      }
    }
    
    return reversed;
  }

  /**
   * Конвертировать массив path в строку
   */
  private pathArrayToString(pathArray: any[]): string {
    return pathArray.map(segment => {
      return segment.join(' ');
    }).join(' ');
  }

  /**
   * Соединить ближайшие открытые концы автоматически
   */
  private joinNearestEnds() {
    if (this.openEnds.length < 2) {
      console.log('⚠️ [JoinTool] Not enough open ends to join');
      return;
    }

    let minDistance = Infinity;
    let closestPair: [any, any] | null = null;

    // Находим ближайшую пару концов
    for (let i = 0; i < this.openEnds.length; i++) {
      for (let j = i + 1; j < this.openEnds.length; j++) {
        const end1 = this.openEnds[i];
        const end2 = this.openEnds[j];

        const distance = Math.sqrt(
          Math.pow(end2.x - end1.x, 2) + Math.pow(end2.y - end1.y, 2)
        );

        if (distance < minDistance && distance <= this.threshold) {
          minDistance = distance;
          closestPair = [end1, end2];
        }
      }
    }

    if (closestPair) {
      console.log('🎯 [JoinTool] Joining nearest ends, distance:', minDistance.toFixed(2));
      
      // Выравниваем точки (усредняем координаты)
      const avgX = (closestPair[0].x + closestPair[1].x) / 2;
      const avgY = (closestPair[0].y + closestPair[1].y) / 2;

      // Обновляем координаты в путях
      this.updateEndPosition(closestPair[0], avgX, avgY);
      this.updateEndPosition(closestPair[1], avgX, avgY);

      // Соединяем
      this.selectedEnds = [
        { path: closestPair[0].path, segmentIndex: closestPair[0].segmentIndex, x: avgX, y: avgY, type: 'end' },
        { path: closestPair[1].path, segmentIndex: closestPair[1].segmentIndex, x: avgX, y: avgY, type: 'start' }
      ];
      this.joinSelectedEnds();
    } else {
      console.log('⚠️ [JoinTool] No ends within threshold distance');
    }
  }

  /**
   * Обновить позицию конца пути
   */
  private updateEndPosition(end: any, x: number, y: number) {
    const path = end.path;
    if (!path.path) return;

    const segment = path.path[end.segmentIndex];
    if (segment[0] === 'M' || segment[0] === 'L') {
      segment[1] = x;
      segment[2] = y;
    } else if (segment[0] === 'C') {
      segment[5] = x;
      segment[6] = y;
    }

    path.dirty = true;
  }

  /**
   * Закрыть все открытые пути
   */
  private closeAllPaths() {
    let closedCount = 0;

    const paths = this.canvas.getObjects().filter(obj => obj.type === 'path' && obj.selectable);

    paths.forEach((pathObj: any) => {
      const path = pathObj as fabric.Path;
      if (!path.path || path.path.length < 2) return;

      const lastSegment = path.path[path.path.length - 1];
      if (lastSegment[0] !== 'Z') {
        path.path.push(['Z']);
        path.dirty = true;
        closedCount++;
      }
    });

    this.canvas.renderAll();
    this.findAndHighlightOpenEnds();

    console.log('✅ [JoinTool] Closed', closedCount, 'paths');
  }

  /**
   * Очистить выделение
   */
  private clearSelection() {
    this.selectedEnds = [];
    
    // Сбрасываем цвет всех маркеров
    this.openEnds.forEach(end => {
      end.marker.set({
        fill: '#EF4444',
        radius: 6,
      });
      (end.marker as any).isSelected = false;
    });

    this.canvas.renderAll();
  }

  /**
   * Очистить все маркеры
   */
  private clearMarkers() {
    this.openEnds.forEach(end => {
      this.canvas.remove(end.marker);
    });
    this.openEnds = [];
    this.canvas.renderAll();
  }
}
