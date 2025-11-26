/**
 * 命令模式实现 - 用于撤销/重做功能
 */
import type { Command, MapPoint } from '@/types/mapEditor';

/**
 * 命令管理器
 */
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize: number = 50;

  /**
   * 执行命令
   */
  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    
    // 限制历史记录数量
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    
    // 新操作清空重做栈
    this.redoStack = [];
  }

  /**
   * 撤销
   */
  undo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }
    
    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    return true;
  }

  /**
   * 重做
   */
  redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }
    
    const command = this.redoStack.pop()!;
    command.redo();
    this.undoStack.push(command);
    return true;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 获取撤销栈大小
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取重做栈大小
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }
}

/**
 * 添加点命令
 */
export class AddPointCommand implements Command {
  private createdPoint: MapPoint | null = null;

  constructor(
    private pointData: Omit<MapPoint, 'id'> & { id?: string },
    private addCallback: (point: Omit<MapPoint, 'id'> & { id?: string }) => MapPoint,
    private removeCallback: (id: string) => void,
    public description: string = '添加点'
  ) {}

  execute(): void {
    const payload = this.createdPoint || this.pointData;
    this.createdPoint = this.addCallback(payload);
  }

  undo(): void {
    if (this.createdPoint) {
      this.removeCallback(this.createdPoint.id);
    }
  }

  redo(): void {
    if (this.createdPoint) {
      this.createdPoint = this.addCallback({ ...this.createdPoint });
    } else {
    this.execute();
    }
  }
}

/**
 * 删除点命令
 */
export class DeletePointCommand implements Command {
  private point: any;

  constructor(
    point: any,
    private removeCallback: (id: string) => void,
    private addCallback: (point: any) => void,
    public description: string = '删除点'
  ) {
    // 深拷贝点数据，用于恢复
    this.point = JSON.parse(JSON.stringify(point));
  }

  execute(): void {
    this.removeCallback(this.point.id);
  }

  undo(): void {
    this.addCallback(this.point);
  }

  redo(): void {
    this.execute();
  }
}

/**
 * 移动点命令
 */
export class MovePointCommand implements Command {
  private oldPosition: { x: number; y: number; z?: number };
  private newPosition: { x: number; y: number; z?: number };

  constructor(
    private pointId: string,
    oldPosition: { x: number; y: number; z?: number },
    newPosition: { x: number; y: number; z?: number },
    private updateCallback: (id: string, position: { x: number; y: number; z?: number }) => void,
    public description: string = '移动点'
  ) {
    this.oldPosition = { ...oldPosition };
    this.newPosition = { ...newPosition };
  }

  execute(): void {
    this.updateCallback(this.pointId, this.newPosition);
  }

  undo(): void {
    this.updateCallback(this.pointId, this.oldPosition);
  }

  redo(): void {
    this.execute();
  }
}

/**
 * 更新属性命令
 */
export class UpdatePropertyCommand implements Command {
  private oldValue: any;
  private newValue: any;

  constructor(
    private elementId: string,
    private propertyPath: string,
    oldValue: any,
    newValue: any,
    private updateCallback: (id: string, path: string, value: any) => void,
    public description: string = '更新属性'
  ) {
    this.oldValue = JSON.parse(JSON.stringify(oldValue));
    this.newValue = JSON.parse(JSON.stringify(newValue));
  }

  execute(): void {
    this.updateCallback(this.elementId, this.propertyPath, this.newValue);
  }

  undo(): void {
    this.updateCallback(this.elementId, this.propertyPath, this.oldValue);
  }

  redo(): void {
    this.execute();
  }
}

