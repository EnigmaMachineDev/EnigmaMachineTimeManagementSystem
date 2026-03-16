// ===== Home Tasks =====
export type HomeTaskCategory = 'repeating' | 'priority' | 'scheduled' | 'freelance' | 'misc';
export type RepeatingType = 'weekly' | 'bimonthly' | 'monthly' | 'quarterly' | 'yearly';
export type TaskStatus = 'incomplete' | 'in-progress' | 'blocked' | 'complete';

export interface HomeTask {
  id: string;
  name: string;
  description: string;
  category: HomeTaskCategory;
  repeatingType?: RepeatingType;
  scheduledDate?: string; // ISO date string
  status: TaskStatus;
  blockedReason?: string;
}

// ===== Work Tasks =====
export type SubtaskStatus = 'incomplete' | 'in-progress' | 'blocked' | 'complete';

export interface Subtask {
  id: string;
  name: string;
  status: SubtaskStatus;
  blockedReason?: string;
}

export interface WorkItem {
  id: string;
  name: string;
  description: string;
  section: 'active' | 'backlog';
  subtasks: Subtask[];
}

// ===== Free Time Tasks =====
export interface FreeTimeCategory {
  id: string;
  name: string;
}

export interface FreeTimeTask {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  section: 'active' | 'backlog';
  status: TaskStatus;
  blockedReason?: string;
}

// ===== Generate Block =====
export type BlockSlotStatus = 'active' | 'complete' | 'in-progress' | 'blocked';

export interface BlockHomeSlot {
  taskId: string;
  currentCategoryIndex: number; // index into priority order array
  status: BlockSlotStatus;
  blockedReason?: string;
}

export interface BlockWorkSlot {
  workItemId: string;
  subtaskId: string;
  status: BlockSlotStatus;
  blockedReason?: string;
}

export interface BlockFreeTimeSlot {
  taskId: string;
  status: BlockSlotStatus;
  blockedReason?: string;
}

export interface TaskBlock {
  id: string;
  homeSlot: BlockHomeSlot | null;
  workSlot: BlockWorkSlot | null;
  freeTimeSlot: BlockFreeTimeSlot | null;
}

// ===== App State =====
export interface AppData {
  version: string;
  homeTasks: HomeTask[];
  workItems: WorkItem[];
  freeTimeCategories: FreeTimeCategory[];
  freeTimeTasks: FreeTimeTask[];
  blocks: TaskBlock[];
}
