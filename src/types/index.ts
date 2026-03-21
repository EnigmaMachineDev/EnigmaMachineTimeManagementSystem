// ===== Flags =====
export interface Flag {
  id: string;
  name: string;
  color: string;
}

// ===== Custom Statuses =====
export interface CustomStatus {
  id: string;
  name: string;
  color: string;
  isComplete: boolean;
  isInProgress: boolean;
  isRollable: boolean;
}

// ===== Task Subtypes =====
export interface TaskSubtype {
  id: string;
  name: string;
  priority: number; // lower = higher priority (display order)
}

// ===== Task Types =====
export interface TaskType {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // hex
  subtypes: TaskSubtype[];
}

// ===== Repeat =====
export type RepeatInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';

// ===== Subtasks =====
export interface Subtask {
  id: string;
  name: string;
  statusId: string;
  flagIds?: string[];
}

// ===== Tasks =====
export interface Task {
  id: string;
  typeId: string;
  subtypeId: string;
  name: string;
  description: string;
  statusId: string;
  priority: number; // lower = higher priority
  flagIds?: string[];
  subtasks: Subtask[];
  repeating?: boolean;
  repeatInterval?: RepeatInterval;
  lastCompletedAt?: string; // ISO date
  dueDate?: string; // ISO date string (YYYY-MM-DD)
}

// ===== Generate Block =====
export interface BlockSlotConfig {
  typeId: string; // taskType id
  flagId?: string;
  subtypeOrder?: string[]; // ordered subtype IDs for priority during roll (omit = use subtype.priority order)
}

export interface BlockTypeConfig {
  id: string;
  name: string;
  slots: BlockSlotConfig[];
}

export type BlockSettings = BlockTypeConfig[];

export interface BlockTaskSlot {
  taskId: string;
  subtaskId?: string;
  status: 'active' | 'skipped' | 'complete';
}

export interface TaskBlock {
  id: string;
  blockConfigId: string;
  slots: (BlockTaskSlot | null)[];
}

// ===== App State =====
export interface AppData {
  version: string;
  flags: Flag[];
  statuses: CustomStatus[];
  taskTypes: TaskType[];
  tasks: Task[];
  blocks: TaskBlock[];
  blockSettings: BlockSettings;
}
