// @ts-nocheck
import * as fabric from 'fabric';

export class TextTool {
  private canvas: fabric.Canvas;
  private isActive: boolean = false;
  private onTextCreated?: () => void;

  constructor(canvas: fabric.Canvas, onTextCreated?: () => void) {
    this.canvas = canvas;
    this.onTextCreated = onTextCreated;
  }

  activate() {
    this.isActive = true;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'text';

    this.canvas.on('mouse:down', this.handleMouseDown);
  }

  deactivate() {
    this.isActive = false;
    this.canvas.selection = true;
    this.canvas.defaultCursor = 'default';

    this.canvas.off('mouse:down', this.handleMouseDown);
  }

  private handleMouseDown = (e: any) => {
    if (!this.isActive) return;

    const pointer = this.canvas.getPointer(e.e);
    const target = e.target;

    // Если кликнули на существующий текст - не создаем новый
    if (target && (target.type === 'i-text' || target.type === 'text')) {
      return;
    }

    // Создаем текстовое поле
    const text = new fabric.IText('', {
      left: pointer.x,
      top: pointer.y,
      fontFamily: 'Arial',
      fontSize: 40,
      fill: '#00aaff',
      editable: true,
    });

    this.canvas.add(text);
    this.canvas.setActiveObject(text);

    // Автоматически входим в режим редактирования
    (text as any).enterEditing();

    this.canvas.renderAll();

    console.log('🔤 Text created at:', pointer);

    // ВАЖНО: Деактивируем TextTool после создания текста
    this.deactivate();

    // Вызываем коллбэк для переключения на Select
    if (this.onTextCreated) {
      this.onTextCreated();
    }
  };
}