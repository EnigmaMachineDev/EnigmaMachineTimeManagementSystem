import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { z } from "zod";
import { loadData, saveData } from "@/lib/storage";
import type {
  AppData,
  Task,
  TaskType,
  TaskSubtype,
  CustomStatus,
  Subtask,
  TaskBlock,
  BlockSettings,
  BlockTypeConfig,
  Flag,
  AppSettings,
} from "@/types";

const STORAGE_KEY = "enigma-time-management-data";

// === Default Statuses ===
const DEFAULT_STATUSES: CustomStatus[] = [
  { id: "status-incomplete", name: "Incomplete", color: "#eab308", isComplete: false, isInProgress: false, isRollable: true },
  { id: "status-in-progress", name: "In Progress", color: "#3b82f6", isComplete: false, isInProgress: true, isRollable: true },
  { id: "status-complete", name: "Complete", color: "#22c55e", isComplete: true, isInProgress: false, isRollable: false },
  { id: "status-blocked", name: "Blocked", color: "#ef4444", isComplete: false, isInProgress: false, isRollable: false },
];

// === Default Task Types ===
const DEFAULT_TASK_TYPES: TaskType[] = [
  {
    id: "type-home", name: "Home Tasks", icon: "Home", color: "#f97316",
    subtypes: [
      { id: "sub-scheduled", name: "Scheduled", priority: 0 },
      { id: "sub-priority", name: "Priority", priority: 1 },
      { id: "sub-repeating", name: "Repeating", priority: 2 },
      { id: "sub-misc", name: "Misc", priority: 3 },
    ],
  },
  {
    id: "type-work", name: "Work Tasks", icon: "Briefcase", color: "#3b82f6",
    subtypes: [
      { id: "sub-active", name: "Active", priority: 0 },
      { id: "sub-backlog", name: "Backlog", priority: 1 },
    ],
  },
  {
    id: "type-free-time", name: "Free Time", icon: "Gamepad2", color: "#22c55e",
    subtypes: [
      { id: "sub-general", name: "General", priority: 0 },
    ],
  },
];

const DEFAULT_BLOCK_SETTINGS: BlockSettings = [
  {
    id: "config-weekend",
    name: "Weekend",
    slots: [
      { typeId: "type-home" },
      { typeId: "type-home" },
      { typeId: "type-home" },
      { typeId: "type-work" },
      { typeId: "type-free-time" },
    ],
  },
  {
    id: "config-weekday",
    name: "Weekday",
    slots: [
      { typeId: "type-home" },
      { typeId: "type-home" },
      { typeId: "type-work" },
      { typeId: "type-work" },
      { typeId: "type-free-time" },
    ],
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  showOverdueIndicator: true,
};

const defaultData: AppData = {
  version: "2.0.0",
  flags: [],
  statuses: DEFAULT_STATUSES,
  taskTypes: DEFAULT_TASK_TYPES,
  tasks: [],
  blocks: [],
  blockSettings: DEFAULT_BLOCK_SETTINGS,
  settings: DEFAULT_SETTINGS,
};

function bumpMinorVersion(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return version;
  return `${parts[0]}.${parts[1] + 1}.${parts[2]}`;
}

// === Hex color validation ===
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export function isValidHexColor(val: string): boolean {
  return HEX_COLOR_RE.test(val);
}
const DEFAULT_COLOR = "#64748b";
function safeColor(val: unknown): string {
  return typeof val === "string" && isValidHexColor(val) ? val : DEFAULT_COLOR;
}

// === Zod schema ===
const FlagSchema = z.object({
  id: z.string().max(200),
  name: z.string().max(200),
  color: z.string().regex(HEX_COLOR_RE),
});

const CustomStatusSchema = z.object({
  id: z.string().max(200),
  name: z.string().max(200),
  color: z.string().regex(HEX_COLOR_RE),
  isComplete: z.boolean(),
  isInProgress: z.boolean(),
  isRollable: z.boolean(),
});

const TaskSubtypeSchema = z.object({
  id: z.string().max(200),
  name: z.string().max(200),
  priority: z.number(),
});

const TaskTypeSchema = z.object({
  id: z.string().max(200),
  name: z.string().max(200),
  icon: z.string().max(100),
  color: z.string().regex(HEX_COLOR_RE),
  subtypes: z.array(TaskSubtypeSchema),
});

const SubtaskSchema = z.object({
  id: z.string().max(200),
  name: z.string().max(200),
  description: z.string().max(2000).optional(),
  statusId: z.string().max(200),
  flagIds: z.array(z.string().max(200)).optional(),
});

const RepeatIntervalSchema = z.enum(["daily", "weekly", "biweekly", "monthly", "bimonthly", "quarterly", "yearly"]);

const TaskSchema = z.object({
  id: z.string().max(200),
  typeId: z.string().max(200),
  subtypeId: z.string().max(200),
  name: z.string().max(200),
  description: z.string().max(2000),
  statusId: z.string().max(200),
  priority: z.number(),
  flagIds: z.array(z.string().max(200)).optional(),
  subtasks: z.array(SubtaskSchema),
  repeating: z.boolean().optional(),
  repeatInterval: RepeatIntervalSchema.optional(),
  lastCompletedAt: z.string().max(100).optional(),
  dueDate: z.string().max(20).optional(),
});

const BlockTaskSlotSchema = z.object({
  taskId: z.string().max(200),
  subtaskId: z.string().max(200).optional(),
  status: z.enum(["active", "skipped", "complete"]),
});

const TaskBlockSchema = z.object({
  id: z.string().max(200),
  blockConfigId: z.string().max(200),
  slots: z.array(BlockTaskSlotSchema.nullable()),
});

const BlockSlotConfigSchema = z.object({
  typeId: z.string().max(200),
  flagId: z.string().max(200).optional(),
  subtypeOrder: z.array(z.string().max(200)).optional(),
});

const BlockTypeConfigSchema = z.object({
  id: z.string().max(200),
  name: z.string().max(200),
  slots: z.array(BlockSlotConfigSchema),
});

const AppSettingsSchema = z.object({
  showOverdueIndicator: z.boolean(),
});

const AppDataSchema = z.object({
  version: z.string().max(20),
  flags: z.array(FlagSchema),
  statuses: z.array(CustomStatusSchema),
  taskTypes: z.array(TaskTypeSchema),
  tasks: z.array(TaskSchema),
  blocks: z.array(TaskBlockSchema),
  blockSettings: z.array(BlockTypeConfigSchema),
  settings: AppSettingsSchema.optional(),
});

function generateId(): string {
  // Use a simple fallback that works on all platforms
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// === Repeating task reset helper ===
function getRepeatDays(interval: string): number {
  switch (interval) {
    case "daily": return 1;
    case "weekly": return 7;
    case "biweekly": return 14;
    case "monthly": return 30;
    case "bimonthly": return 60;
    case "quarterly": return 90;
    case "yearly": return 365;
    default: return 7;
  }
}

// === Migration from old format ===
function migrateOldData(parsed: any): AppData {
  // Already new format?
  if (Array.isArray(parsed.taskTypes) && Array.isArray(parsed.statuses)) {
    // Ensure all taskTypes have subtypes array (v2.0 → v2.1 migration)
    const taskTypes = (parsed.taskTypes as any[]).map((tt: any) => {
      if (Array.isArray(tt.subtypes) && tt.subtypes.length > 0) return tt;
      return { ...tt, subtypes: [{ id: generateId(), name: "General", priority: 0 }] };
    });
    // Ensure all tasks have subtypeId
    const tasks = (parsed.tasks as any[]).map((t: any) => {
      if (t.subtypeId) return t;
      const tt = taskTypes.find((typ: any) => typ.id === t.typeId);
      return { ...t, subtypeId: tt?.subtypes?.[0]?.id || "" };
    });
    // Ensure all statuses have isRollable (blocked defaults false, others default true)
    const statuses = (parsed.statuses as any[]).map((s: any) => ({
      ...s,
      isRollable: s.isRollable !== undefined ? s.isRollable : s.id !== "status-blocked",
    }));
    return {
      version: typeof parsed.version === "string" ? parsed.version : "2.1.0",
      flags: Array.isArray(parsed.flags) ? parsed.flags : defaultData.flags,
      statuses,
      taskTypes,
      tasks,
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : defaultData.blocks,
      blockSettings: Array.isArray(parsed.blockSettings) ? parsed.blockSettings : defaultData.blockSettings,
      settings: parsed.settings && typeof parsed.settings === "object"
        ? { ...DEFAULT_SETTINGS, ...parsed.settings }
        : DEFAULT_SETTINGS,
    };
  }

  // Old format → migrate
  const statuses = [...DEFAULT_STATUSES];
  const statusMap: Record<string, string> = {
    incomplete: "status-incomplete",
    "in-progress": "status-in-progress",
    complete: "status-complete",
    blocked: "status-blocked",
  };

  const homeSubtypeMap: Record<string, string> = {
    scheduled: "sub-scheduled",
    priority: "sub-priority",
    repeating: "sub-repeating",
    freelance: "sub-freelance",
    misc: "sub-misc",
  };

  const taskTypes: TaskType[] = [
    {
      id: "type-home", name: "Home Tasks", icon: "Home", color: "#f97316",
      subtypes: [
        { id: "sub-scheduled", name: "Scheduled", priority: 0 },
        { id: "sub-priority", name: "Priority", priority: 1 },
        { id: "sub-repeating", name: "Repeating", priority: 2 },
        { id: "sub-freelance", name: "Freelance Development", priority: 3 },
        { id: "sub-misc", name: "Misc", priority: 4 },
      ],
    },
    {
      id: "type-work", name: "Work Tasks", icon: "Briefcase", color: "#3b82f6",
      subtypes: [
        { id: "sub-work-active", name: "Active", priority: 0 },
        { id: "sub-work-backlog", name: "Backlog", priority: 1 },
      ],
    },
  ];

  const ftCats: any[] = parsed.freeTimeCategories || [];
  const ftCatIdMap: Record<string, string> = {};
  if (ftCats.length > 0) {
    for (const cat of ftCats) {
      const newId = `type-ft-${cat.id}`;
      ftCatIdMap[cat.id] = newId;
      taskTypes.push({
        id: newId, name: cat.name, icon: "Gamepad2", color: "#22c55e",
        subtypes: [{ id: `sub-ft-${cat.id}`, name: "General", priority: 0 }],
      });
    }
  } else {
    taskTypes.push({
      id: "type-free-time", name: "Free Time", icon: "Gamepad2", color: "#22c55e",
      subtypes: [{ id: "sub-ft-general", name: "General", priority: 0 }],
    });
  }

  const tasks: Task[] = [];
  let priority = 0;

  const homeTasks: any[] = parsed.homeTasks || [];
  for (const ht of homeTasks) {
    const repeating = ht.category === "repeating";
    let repeatInterval: string | undefined;
    if (repeating && ht.repeatingType) {
      const intervalMap: Record<string, string> = {
        weekly: "weekly", biweekly: "biweekly", bimonthly: "biweekly", monthly: "monthly",
        quarterly: "monthly", yearly: "monthly",
      };
      repeatInterval = intervalMap[ht.repeatingType] || "weekly";
    }
    tasks.push({
      id: ht.id || generateId(),
      typeId: "type-home",
      subtypeId: homeSubtypeMap[ht.category] || "sub-misc",
      name: ht.name || "",
      description: ht.description || "",
      statusId: statusMap[ht.status] || "status-incomplete",
      priority: priority++,
      flagIds: ht.flagIds || [],
      subtasks: (ht.subtasks || []).map((s: any) => ({
        id: s.id || generateId(),
        name: s.name || "",
        statusId: statusMap[s.status] || "status-incomplete",
        flagIds: s.flagIds || [],
      })),
      repeating: repeating || undefined,
      repeatInterval: repeatInterval as any,
      lastCompletedAt: ht.status === "complete" ? new Date().toISOString() : undefined,
    });
  }

  priority = 0;
  const workItems: any[] = parsed.workItems || [];
  for (const wi of workItems) {
    const workSubtypeId = wi.isActive === false ? "sub-work-backlog" : "sub-work-active";
    tasks.push({
      id: wi.id || generateId(),
      typeId: "type-work",
      subtypeId: workSubtypeId,
      name: wi.name || "",
      description: wi.description || "",
      statusId: statusMap[wi.status] || "status-incomplete",
      priority: priority++,
      flagIds: wi.flagIds || [],
      subtasks: (wi.subtasks || []).map((s: any) => ({
        id: s.id || generateId(),
        name: s.name || "",
        statusId: statusMap[s.status] || "status-incomplete",
        flagIds: s.flagIds || [],
      })),
    });
  }

  priority = 0;
  const ftTasks: any[] = parsed.freeTimeTasks || [];
  for (const ft of ftTasks) {
    const typeId = ftCatIdMap[ft.categoryId] || "type-free-time";
    const ftSubtypeId = ftCatIdMap[ft.categoryId] ? `sub-ft-${ft.categoryId}` : "sub-ft-general";
    tasks.push({
      id: ft.id || generateId(),
      typeId,
      subtypeId: ftSubtypeId,
      name: ft.name || "",
      description: ft.description || "",
      statusId: statusMap[ft.status] || "status-incomplete",
      priority: priority++,
      flagIds: ft.flagIds || [],
      subtasks: [],
    });
  }

  const slotTypeMap: Record<string, string> = {
    home: "type-home",
    work: "type-work",
    freeTime: ftCats.length > 0 ? `type-ft-${ftCats[0].id}` : "type-free-time",
  };

  const blockSettings: BlockSettings = Array.isArray(parsed.blockSettings)
    ? parsed.blockSettings.map((c: any) => ({
        id: c.id || generateId(),
        name: c.name || "Block",
        slots: (c.slots || []).map((s: any) => ({
          typeId: slotTypeMap[s.type] || s.typeId || "type-home",
          flagId: s.flagId,
        })),
      }))
    : DEFAULT_BLOCK_SETTINGS;

  return {
    version: "2.0.0",
    flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    statuses,
    taskTypes,
    tasks,
    blocks: [],
    blockSettings,
    settings: DEFAULT_SETTINGS,
  };
}

interface AppContextType {
  data: AppData;
  loaded: boolean;
  // Task Types
  addTaskType: (type: Omit<TaskType, "id">) => void;
  updateTaskType: (type: TaskType) => void;
  deleteTaskType: (id: string) => void;
  reorderTaskType: (typeId: string, direction: "up" | "down") => void;
  // Task Subtypes
  addTaskSubtype: (typeId: string, name: string) => void;
  updateTaskSubtype: (typeId: string, subtypeId: string, name: string) => void;
  deleteTaskSubtype: (typeId: string, subtypeId: string) => void;
  reorderTaskSubtype: (typeId: string, subtypeId: string, direction: "up" | "down") => void;
  // Statuses
  addStatus: (status: Omit<CustomStatus, "id">) => void;
  updateStatus: (status: CustomStatus) => void;
  deleteStatus: (id: string) => void;
  // Tasks
  addTask: (task: Omit<Task, "id" | "subtasks">) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  reorderTask: (taskId: string, direction: "up" | "down") => void;
  clearCompletedTasks: (typeId: string) => void;
  // Subtasks
  addSubtask: (taskId: string, subtask: Omit<Subtask, "id">) => void;
  updateSubtask: (taskId: string, subtask: Subtask) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  // Flags
  addFlag: (flag: Omit<Flag, "id">) => void;
  updateFlag: (flag: Flag) => void;
  deleteFlag: (id: string) => void;
  // Blocks
  addBlock: (block: TaskBlock) => void;
  updateBlock: (block: TaskBlock) => void;
  deleteBlock: (id: string) => void;
  updateBlockSettings: (settings: BlockSettings) => void;
  addBlockTypeConfig: (config: Omit<BlockTypeConfig, "id">) => void;
  updateBlockTypeConfig: (config: BlockTypeConfig) => void;
  deleteBlockTypeConfig: (id: string) => void;
  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;
  // Import/Export
  exportData: () => string;
  importData: (json: string) => boolean;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [loaded, setLoaded] = useState(false);

  // Load from storage on mount + migrate + reset repeating tasks
  useEffect(() => {
    (async () => {
      try {
        const stored = await loadData();
        if (stored) {
          const parsed = JSON.parse(stored);
          const migrated = migrateOldData(parsed);

          // Reset repeating tasks whose interval has elapsed
          const now = new Date();
          const resetTasks = migrated.tasks.map((task) => {
            if (!task.repeating || !task.repeatInterval || !task.lastCompletedAt) return task;
            const status = migrated.statuses.find((s) => s.id === task.statusId);
            if (!status?.isComplete) return task;
            const lastCompleted = new Date(task.lastCompletedAt);
            const diffDays = (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays >= getRepeatDays(task.repeatInterval)) {
              const defaultStatus = migrated.statuses.find((s) => !s.isComplete && !s.isInProgress);
              return { ...task, statusId: defaultStatus?.id || "status-incomplete" };
            }
            return task;
          });

          setData({ ...migrated, tasks: resetTasks });
        }
      } catch {
        // ignore
      }
      setLoaded(true);
    })();
  }, []);

  // Persist to storage
  useEffect(() => {
    if (loaded) {
      saveData(JSON.stringify(data)).catch(() => {});
    }
  }, [data, loaded]);

  // === Task Types ===
  const addTaskType = useCallback((type: Omit<TaskType, "id">) => {
    setData((prev) => ({ ...prev, taskTypes: [...prev.taskTypes, { ...type, color: safeColor(type.color), id: generateId() }] }));
  }, []);

  const updateTaskType = useCallback((type: TaskType) => {
    setData((prev) => ({ ...prev, taskTypes: prev.taskTypes.map((t) => (t.id === type.id ? { ...type, color: safeColor(type.color) } : t)) }));
  }, []);

  const deleteTaskType = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      taskTypes: prev.taskTypes.filter((t) => t.id !== id),
      tasks: prev.tasks.filter((t) => t.typeId !== id),
      blockSettings: prev.blockSettings.map((c) => ({
        ...c,
        slots: c.slots.filter((s) => s.typeId !== id),
      })),
    }));
  }, []);

  const reorderTaskType = useCallback((typeId: string, direction: "up" | "down") => {
    setData((prev) => {
      const idx = prev.taskTypes.findIndex((t) => t.id === typeId);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.taskTypes.length) return prev;
      const newTypes = [...prev.taskTypes];
      [newTypes[idx], newTypes[swapIdx]] = [newTypes[swapIdx], newTypes[idx]];
      return { ...prev, taskTypes: newTypes };
    });
  }, []);

  // === Task Subtypes ===
  const addTaskSubtype = useCallback((typeId: string, name: string) => {
    setData((prev) => ({
      ...prev,
      taskTypes: prev.taskTypes.map((tt) => {
        if (tt.id !== typeId) return tt;
        const maxP = tt.subtypes.reduce((max, s) => Math.max(max, s.priority), -1);
        return { ...tt, subtypes: [...tt.subtypes, { id: generateId(), name, priority: maxP + 1 }] };
      }),
    }));
  }, []);

  const updateTaskSubtype = useCallback((typeId: string, subtypeId: string, name: string) => {
    setData((prev) => ({
      ...prev,
      taskTypes: prev.taskTypes.map((tt) => {
        if (tt.id !== typeId) return tt;
        return { ...tt, subtypes: tt.subtypes.map((s) => (s.id === subtypeId ? { ...s, name } : s)) };
      }),
    }));
  }, []);

  const deleteTaskSubtype = useCallback((typeId: string, subtypeId: string) => {
    setData((prev) => {
      const tt = prev.taskTypes.find((t) => t.id === typeId);
      if (!tt || tt.subtypes.length <= 1) return prev;
      const fallback = tt.subtypes.find((s) => s.id !== subtypeId)!;
      return {
        ...prev,
        taskTypes: prev.taskTypes.map((t) => {
          if (t.id !== typeId) return t;
          return { ...t, subtypes: t.subtypes.filter((s) => s.id !== subtypeId) };
        }),
        tasks: prev.tasks.map((t) =>
          t.typeId === typeId && t.subtypeId === subtypeId ? { ...t, subtypeId: fallback.id } : t
        ),
      };
    });
  }, []);

  const reorderTaskSubtype = useCallback((typeId: string, subtypeId: string, direction: "up" | "down") => {
    setData((prev) => ({
      ...prev,
      taskTypes: prev.taskTypes.map((tt) => {
        if (tt.id !== typeId) return tt;
        const sorted = [...tt.subtypes].sort((a, b) => a.priority - b.priority);
        const idx = sorted.findIndex((s) => s.id === subtypeId);
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= sorted.length) return tt;
        const newSubtypes = tt.subtypes.map((s) => {
          if (s.id === sorted[idx].id) return { ...s, priority: sorted[swapIdx].priority };
          if (s.id === sorted[swapIdx].id) return { ...s, priority: sorted[idx].priority };
          return s;
        });
        return { ...tt, subtypes: newSubtypes };
      }),
    }));
  }, []);

  // === Statuses ===
  const addStatus = useCallback((status: Omit<CustomStatus, "id">) => {
    setData((prev) => ({ ...prev, statuses: [...prev.statuses, { ...status, color: safeColor(status.color), id: generateId() }] }));
  }, []);

  const updateStatus = useCallback((status: CustomStatus) => {
    setData((prev) => ({ ...prev, statuses: prev.statuses.map((s) => (s.id === status.id ? { ...status, color: safeColor(status.color) } : s)) }));
  }, []);

  const deleteStatus = useCallback((id: string) => {
    setData((prev) => {
      if (prev.statuses.length <= 1) return prev;
      const fallback = prev.statuses.find((s) => s.id !== id)!;
      return {
        ...prev,
        statuses: prev.statuses.filter((s) => s.id !== id),
        tasks: prev.tasks.map((t) => ({
          ...t,
          statusId: t.statusId === id ? fallback.id : t.statusId,
          subtasks: t.subtasks.map((s) => ({
            ...s,
            statusId: s.statusId === id ? fallback.id : s.statusId,
          })),
        })),
      };
    });
  }, []);

  // === Tasks ===
  const addTask = useCallback((task: Omit<Task, "id" | "subtasks">) => {
    setData((prev) => {
      const maxPriority = prev.tasks
        .filter((t) => t.typeId === task.typeId)
        .reduce((max, t) => Math.max(max, t.priority), -1);
      return {
        ...prev,
        tasks: [...prev.tasks, { ...task, id: generateId(), subtasks: [], priority: maxPriority + 1 }],
      };
    });
  }, []);

  const updateTask = useCallback((task: Task) => {
    setData((prev) => {
      const oldTask = prev.tasks.find((t) => t.id === task.id);
      const newStatus = prev.statuses.find((s) => s.id === task.statusId);
      const oldStatus = oldTask ? prev.statuses.find((s) => s.id === oldTask.statusId) : null;
      let updatedTask = task;
      if (newStatus?.isComplete && !oldStatus?.isComplete && task.repeating) {
        updatedTask = { ...task, lastCompletedAt: new Date().toISOString() };
      }
      return {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      };
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setData((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
  }, []);

  const reorderTask = useCallback((taskId: string, direction: "up" | "down") => {
    setData((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      if (!task) return prev;
      const typeTasks = prev.tasks
        .filter((t) => t.typeId === task.typeId)
        .sort((a, b) => a.priority - b.priority);
      const idx = typeTasks.findIndex((t) => t.id === taskId);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= typeTasks.length) return prev;
      const swapTask = typeTasks[swapIdx];
      const newTasks = prev.tasks.map((t) => {
        if (t.id === task.id) return { ...t, priority: swapTask.priority };
        if (t.id === swapTask.id) return { ...t, priority: task.priority };
        return t;
      });
      return { ...prev, tasks: newTasks };
    });
  }, []);

  const clearCompletedTasks = useCallback((typeId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => {
        if (t.typeId !== typeId) return true;
        const status = prev.statuses.find((s) => s.id === t.statusId);
        if (status?.isComplete && !t.repeating) return false;
        return true;
      }),
    }));
  }, []);

  // === Subtasks ===
  const addSubtask = useCallback((taskId: string, subtask: Omit<Subtask, "id">) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, { ...subtask, id: generateId() }] }
          : t
      ),
    }));
  }, []);

  const updateSubtask = useCallback((taskId: string, subtask: Subtask) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtask.id ? subtask : s)) }
          : t
      ),
    }));
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }
          : t
      ),
    }));
  }, []);

  // === Flags ===
  const addFlag = useCallback((flag: Omit<Flag, "id">) => {
    setData((prev) => ({ ...prev, flags: [...prev.flags, { ...flag, color: safeColor(flag.color), id: generateId() }] }));
  }, []);

  const updateFlag = useCallback((flag: Flag) => {
    setData((prev) => ({ ...prev, flags: prev.flags.map((f) => (f.id === flag.id ? { ...flag, color: safeColor(flag.color) } : f)) }));
  }, []);

  const deleteFlag = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      flags: prev.flags.filter((f) => f.id !== id),
      tasks: prev.tasks.map((t) => ({
        ...t,
        flagIds: (t.flagIds ?? []).filter((fid) => fid !== id),
        subtasks: t.subtasks.map((s) => ({ ...s, flagIds: (s.flagIds ?? []).filter((fid) => fid !== id) })),
      })),
      blockSettings: prev.blockSettings.map((c) => ({
        ...c,
        slots: c.slots.map((s) => ({ ...s, flagId: s.flagId === id ? undefined : s.flagId })),
      })),
    }));
  }, []);

  // === Blocks ===
  const addBlock = useCallback((block: TaskBlock) => {
    setData((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
  }, []);

  const updateBlock = useCallback((block: TaskBlock) => {
    setData((prev) => ({ ...prev, blocks: prev.blocks.map((b) => (b.id === block.id ? block : b)) }));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setData((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }));
  }, []);

  const updateBlockSettings = useCallback((settings: BlockSettings) => {
    setData((prev) => ({ ...prev, blockSettings: settings }));
  }, []);

  const addBlockTypeConfig = useCallback((config: Omit<BlockTypeConfig, "id">) => {
    setData((prev) => ({
      ...prev,
      blockSettings: [...prev.blockSettings, { ...config, id: generateId() }],
    }));
  }, []);

  const updateBlockTypeConfig = useCallback((config: BlockTypeConfig) => {
    setData((prev) => ({
      ...prev,
      blockSettings: prev.blockSettings.map((c) => (c.id === config.id ? config : c)),
    }));
  }, []);

  const deleteBlockTypeConfig = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      blockSettings: prev.blockSettings.filter((c) => c.id !== id),
      blocks: prev.blocks.filter((b) => b.blockConfigId !== id),
    }));
  }, []);

  // === Settings ===
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) => ({ ...prev, settings: { ...(prev.settings ?? DEFAULT_SETTINGS), ...patch } }));
  }, []);

  // === Import/Export ===
  const exportData = useCallback(() => {
    const exportedData = { ...data, version: bumpMinorVersion(data.version) };
    setData(exportedData);
    return JSON.stringify(exportedData, null, 2);
  }, [data]);

  const importData = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed.taskTypes) && Array.isArray(parsed.statuses)) {
        const result = AppDataSchema.safeParse(parsed);
        if (!result.success) return false;
        const migrated = migrateOldData(result.data);
        setData(migrated);
        return true;
      }
      const migrated = migrateOldData(parsed);
      setData(migrated);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearAllData = useCallback(() => {
    setData(defaultData);
  }, []);

  return (
    <AppContext.Provider
      value={{
        data,
        loaded,
        addTaskType,
        updateTaskType,
        deleteTaskType,
        reorderTaskType,
        addTaskSubtype,
        updateTaskSubtype,
        deleteTaskSubtype,
        reorderTaskSubtype,
        addStatus,
        updateStatus,
        deleteStatus,
        addTask,
        updateTask,
        deleteTask,
        reorderTask,
        clearCompletedTasks,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        addFlag,
        updateFlag,
        deleteFlag,
        addBlock,
        updateBlock,
        deleteBlock,
        updateBlockSettings,
        addBlockTypeConfig,
        updateBlockTypeConfig,
        deleteBlockTypeConfig,
        updateSettings,
        exportData,
        importData,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
