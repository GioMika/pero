import paper from 'paper';

export class PaperTools {
  private static currentPath: paper.Path | null = null;

  /**
   * Инициализирует Pen tool (как в Illustrator)
   */
  static initPenTool(onPathComplete: (path: paper.Path) => void) {
    const tool = new paper.Tool();

    tool.onMouseDown = (event: paper.ToolEvent) => {
      if (!this.currentPath) {
        // Создаем новый путь
        this.currentPath = new paper.Path({
          strokeColor: new paper.Color('#00aaff'),
          strokeWidth: 2,
          fillColor: null,
        });
      }

      // Добавляем точку
      this.currentPath.add(event.point);
    };

    tool.onKeyDown = (event: paper.KeyEvent) => {
      if (event.key === 'enter' && this.currentPath) {
        // Завершаем путь
        this.currentPath.closed = true;
        onPathComplete(this.currentPath);
        this.currentPath = null;
      }
      if (event.key === 'escape') {
        // Отменяем путь
        if (this.currentPath) {
          this.currentPath.remove();
          this.currentPath = null;
        }
      }
    };

    return tool;
  }

  /**
   * Инициализирует Select tool
   */
  static initSelectTool(onSelect: (item: paper.Item | null) => void) {
    const tool = new paper.Tool();
    let selectedItem: paper.Item | null = null;

    tool.onMouseDown = (event: paper.ToolEvent) => {
      const hitResult = paper.project.activeLayer.hitTest(event.point, {
        segments: true,
        stroke: true,
        fill: true,
        tolerance: 5,
      });

      if (hitResult) {
        if (selectedItem) {
          selectedItem.selected = false;
        }
        selectedItem = hitResult.item;
        selectedItem.selected = true;
        onSelect(selectedItem);
      } else {
        if (selectedItem) {
          selectedItem.selected = false;
          selectedItem = null;
          onSelect(null);
        }
      }
    };

    return tool;
  }

  /**
   * Создает guidelines (как в нашем редакторе)
   */
  static drawGuidelines() {
    const guidelines = new paper.Group();

    // Baseline (красная)
    const baseline = new paper.Path.Line({
      from: new paper.Point(-2000, 0),
      to: new paper.Point(2000, 0),
      strokeColor: new paper.Color('#ff0000'),
      strokeWidth: 2,
      locked: true,
      name: 'baseline',
    });

    // Ascender (зеленая)
    const ascender = new paper.Path.Line({
      from: new paper.Point(-2000, -800),
      to: new paper.Point(2000, -800),
      strokeColor: new paper.Color('#00ff00'),
      strokeWidth: 1,
      locked: true,
      name: 'ascender',
    });

    // Descender (синяя)
    const descender = new paper.Path.Line({
      from: new paper.Point(-2000, 200),
      to: new paper.Point(2000, 200),
      strokeColor: new paper.Color('#0000ff'),
      strokeWidth: 1,
      locked: true,
      name: 'descender',
    });

    // Cap height (пунктирная)
    const capHeight = new paper.Path.Line({
      from: new paper.Point(-2000, -700),
      to: new paper.Point(2000, -700),
      strokeColor: new paper.Color('#666666'),
      strokeWidth: 1,
      dashArray: [10, 5],
      locked: true,
      name: 'capHeight',
    });

    // X-height (пунктирная)
    const xHeight = new paper.Path.Line({
      from: new paper.Point(-2000, -500),
      to: new paper.Point(2000, -500),
      strokeColor: new paper.Color('#666666'),
      strokeWidth: 1,
      dashArray: [10, 5],
      locked: true,
      name: 'xHeight',
    });

    // Вертикальная центральная
    const centerLine = new paper.Path.Line({
      from: new paper.Point(500, -2000),
      to: new paper.Point(500, 2000),
      strokeColor: new paper.Color('#666666'),
      strokeWidth: 2,
      locked: true,
      name: 'centerLine',
    });

    guidelines.addChildren([baseline, ascender, descender, capHeight, xHeight, centerLine]);
    return guidelines;
  }

  /**
   * Рисует сетку
   */
  static drawGrid(gridSize: number = 50) {
    const grid = new paper.Group();

    // Используем фиксированные границы
    const bounds = {
      left: -1000,
      right: 2000,
      top: -1500,
      bottom: 500,
    };

    const color = new paper.Color('#2a2a2a');

    // Вертикальные линии
    for (let x = bounds.left; x < bounds.right; x += gridSize) {
      const line = new paper.Path.Line({
        from: new paper.Point(x, bounds.top),
        to: new paper.Point(x, bounds.bottom),
        strokeColor: color,
        strokeWidth: 0.5,
        locked: true,
      });
      grid.addChild(line);
    }

    // Горизонтальные линии
    for (let y = bounds.top; y < bounds.bottom; y += gridSize) {
      const line = new paper.Path.Line({
        from: new paper.Point(bounds.left, y),
        to: new paper.Point(bounds.right, y),
        strokeColor: color,
        strokeWidth: 0.5,
        locked: true,
      });
      grid.addChild(line);
    }

    grid.sendToBack();
    return grid;
  }
}