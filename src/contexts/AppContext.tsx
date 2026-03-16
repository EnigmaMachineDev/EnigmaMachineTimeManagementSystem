"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type {
  AppData,
  HomeTask,
  HomeTaskCategory,
  WorkItem,
  Subtask,
  FreeTimeCategory,
  FreeTimeTask,
  TaskBlock,
  RepeatingType,
} from "@/types";

const STORAGE_KEY = "enigma-time-management-data";

const DEFAULT_CATEGORIES: FreeTimeCategory[] = [
  { id: "cat-gaming", name: "Gaming" },
  { id: "cat-brewing", name: "Brewing" },
  { id: "cat-building", name: "Building" },
  { id: "cat-artwork", name: "Artwork" },
  { id: "cat-reading", name: "Reading" },
  { id: "cat-music", name: "Music" },
];

const defaultData: AppData = {
  version: "1.0.0",
  homeTasks: [],
  workItems: [],
  freeTimeCategories: DEFAULT_CATEGORIES,
  freeTimeTasks: [],
  blocks: [],
};

function bumpMinorVersion(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return version;
  return `${parts[0]}.${parts[1] + 1}.${parts[2]}`;
}

interface AppContextType {
  data: AppData;
  // Home Tasks
  addHomeTask: (task: Omit<HomeTask, "id">) => void;
  updateHomeTask: (task: HomeTask) => void;
  deleteHomeTask: (id: string) => void;
  resetRepeating: (type: RepeatingType) => void;
  // Work Items
  addWorkItem: (item: Omit<WorkItem, "id" | "subtasks">) => void;
  updateWorkItem: (item: WorkItem) => void;
  deleteWorkItem: (id: string) => void;
  moveWorkItem: (id: string, section: "active" | "backlog") => void;
  addSubtask: (workItemId: string, subtask: Omit<Subtask, "id">) => void;
  updateSubtask: (workItemId: string, subtask: Subtask) => void;
  deleteSubtask: (workItemId: string, subtaskId: string) => void;
  // Free Time
  addFreeTimeCategory: (name: string) => void;
  deleteFreeTimeCategory: (id: string) => void;
  updateFreeTimeCategory: (id: string, name: string) => void;
  addFreeTimeTask: (task: Omit<FreeTimeTask, "id">) => void;
  updateFreeTimeTask: (task: FreeTimeTask) => void;
  deleteFreeTimeTask: (id: string) => void;
  moveFreeTimeTask: (id: string, section: "active" | "backlog") => void;
  // Bulk clear completed
  clearCompletedHomeTasks: () => void;
  clearCompletedWorkItems: () => void;
  clearCompletedFreeTimeTasks: () => void;
  // Blocks
  addBlock: (block: TaskBlock) => void;
  updateBlock: (block: TaskBlock) => void;
  deleteBlock: (id: string) => void;
  // Import/Export
  exportData: () => string;
  importData: (json: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppData;
        // Filter out old blocks that don't have the new array format
        const validBlocks = (parsed.blocks || []).filter((b: any) => 
          Array.isArray(b.homeSlots) && Array.isArray(b.workSlots) && Array.isArray(b.freeTimeSlots)
        );
        setData({
          ...defaultData,
          ...parsed,
          blocks: validBlocks,
          freeTimeCategories: parsed.freeTimeCategories?.length
            ? parsed.freeTimeCategories
            : DEFAULT_CATEGORIES,
        });
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage on data change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, loaded]);

  // === Home Tasks ===
  const addHomeTask = useCallback((task: Omit<HomeTask, "id">) => {
    setData((prev) => ({
      ...prev,
      homeTasks: [...prev.homeTasks, { ...task, id: generateId() }],
    }));
  }, []);

  const updateHomeTask = useCallback((task: HomeTask) => {
    setData((prev) => ({
      ...prev,
      homeTasks: prev.homeTasks.map((t) => (t.id === task.id ? task : t)),
    }));
  }, []);

  const deleteHomeTask = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      homeTasks: prev.homeTasks.filter((t) => t.id !== id),
    }));
  }, []);

  const resetRepeating = useCallback((type: RepeatingType) => {
    setData((prev) => ({
      ...prev,
      homeTasks: prev.homeTasks.map((t) =>
        t.category === "repeating" && t.repeatingType === type && t.status === "complete"
          ? { ...t, status: "incomplete" }
          : t
      ),
    }));
  }, []);

  // === Work Items ===
  const addWorkItem = useCallback((item: Omit<WorkItem, "id" | "subtasks">) => {
    setData((prev) => ({
      ...prev,
      workItems: [...prev.workItems, { ...item, id: generateId(), subtasks: [] }],
    }));
  }, []);

  const updateWorkItem = useCallback((item: WorkItem) => {
    setData((prev) => ({
      ...prev,
      workItems: prev.workItems.map((w) => (w.id === item.id ? item : w)),
    }));
  }, []);

  const deleteWorkItem = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      workItems: prev.workItems.filter((w) => w.id !== id),
    }));
  }, []);

  const moveWorkItem = useCallback((id: string, section: "active" | "backlog") => {
    setData((prev) => {
      if (section === "active") {
        const activeCount = prev.workItems.filter((w) => w.section === "active").length;
        if (activeCount >= 5) return prev;
      }
      return {
        ...prev,
        workItems: prev.workItems.map((w) => (w.id === id ? { ...w, section } : w)),
      };
    });
  }, []);

  const addSubtask = useCallback((workItemId: string, subtask: Omit<Subtask, "id">) => {
    setData((prev) => ({
      ...prev,
      workItems: prev.workItems.map((w) =>
        w.id === workItemId
          ? { ...w, subtasks: [...w.subtasks, { ...subtask, id: generateId() }] }
          : w
      ),
    }));
  }, []);

  const updateSubtask = useCallback((workItemId: string, subtask: Subtask) => {
    setData((prev) => ({
      ...prev,
      workItems: prev.workItems.map((w) =>
        w.id === workItemId
          ? { ...w, subtasks: w.subtasks.map((s) => (s.id === subtask.id ? subtask : s)) }
          : w
      ),
    }));
  }, []);

  const deleteSubtask = useCallback((workItemId: string, subtaskId: string) => {
    setData((prev) => ({
      ...prev,
      workItems: prev.workItems.map((w) =>
        w.id === workItemId
          ? { ...w, subtasks: w.subtasks.filter((s) => s.id !== subtaskId) }
          : w
      ),
    }));
  }, []);

  // === Free Time ===
  const addFreeTimeCategory = useCallback((name: string) => {
    setData((prev) => ({
      ...prev,
      freeTimeCategories: [...prev.freeTimeCategories, { id: generateId(), name }],
    }));
  }, []);

  const deleteFreeTimeCategory = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      freeTimeCategories: prev.freeTimeCategories.filter((c) => c.id !== id),
      freeTimeTasks: prev.freeTimeTasks.filter((t) => t.categoryId !== id),
    }));
  }, []);

  const updateFreeTimeCategory = useCallback((id: string, name: string) => {
    setData((prev) => ({
      ...prev,
      freeTimeCategories: prev.freeTimeCategories.map((c) =>
        c.id === id ? { ...c, name } : c
      ),
    }));
  }, []);

  const addFreeTimeTask = useCallback((task: Omit<FreeTimeTask, "id">) => {
    setData((prev) => ({
      ...prev,
      freeTimeTasks: [...prev.freeTimeTasks, { ...task, id: generateId() }],
    }));
  }, []);

  const updateFreeTimeTask = useCallback((task: FreeTimeTask) => {
    setData((prev) => ({
      ...prev,
      freeTimeTasks: prev.freeTimeTasks.map((t) => (t.id === task.id ? task : t)),
    }));
  }, []);

  const deleteFreeTimeTask = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      freeTimeTasks: prev.freeTimeTasks.filter((t) => t.id !== id),
    }));
  }, []);

  const moveFreeTimeTask = useCallback((id: string, section: "active" | "backlog") => {
    setData((prev) => {
      if (section === "active") {
        const task = prev.freeTimeTasks.find((t) => t.id === id);
        if (task) {
          const activeInCategory = prev.freeTimeTasks.filter(
            (t) => t.categoryId === task.categoryId && t.section === "active"
          ).length;
          if (activeInCategory >= 2) return prev;
        }
      }
      return {
        ...prev,
        freeTimeTasks: prev.freeTimeTasks.map((t) => (t.id === id ? { ...t, section } : t)),
      };
    });
  }, []);

  // === Bulk clear completed ===
  const clearCompletedHomeTasks = useCallback(() => {
    setData((prev) => ({
      ...prev,
      homeTasks: prev.homeTasks.filter((t) => t.status !== "complete" || t.category === "repeating"),
    }));
  }, []);

  const clearCompletedWorkItems = useCallback(() => {
    setData((prev) => ({
      ...prev,
      workItems: prev.workItems.map((w) => ({
        ...w,
        subtasks: w.subtasks.filter((s) => s.status !== "complete"),
      })),
    }));
  }, []);

  const clearCompletedFreeTimeTasks = useCallback(() => {
    setData((prev) => ({
      ...prev,
      freeTimeTasks: prev.freeTimeTasks.filter((t) => (t.status ?? "incomplete") !== "complete"),
    }));
  }, []);

  // === Blocks ===
  const addBlock = useCallback((block: TaskBlock) => {
    setData((prev) => ({
      ...prev,
      blocks: [...prev.blocks, block],
    }));
  }, []);

  const updateBlock = useCallback((block: TaskBlock) => {
    setData((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === block.id ? block : b)),
    }));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
  }, []);

  // === Import/Export ===
  const exportData = useCallback(() => {
    const exportedData = { ...data, version: bumpMinorVersion(data.version) };
    setData(exportedData);
    return JSON.stringify(exportedData, null, 2);
  }, [data]);

  const importData = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as AppData;
      if (parsed.homeTasks && parsed.workItems && parsed.freeTimeTasks) {
        setData({
          ...defaultData,
          ...parsed,
          version: parsed.version ?? "1.0.0",
          freeTimeCategories: parsed.freeTimeCategories?.length
            ? parsed.freeTimeCategories
            : DEFAULT_CATEGORIES,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        data,
        addHomeTask,
        updateHomeTask,
        deleteHomeTask,
        resetRepeating,
        addWorkItem,
        updateWorkItem,
        deleteWorkItem,
        moveWorkItem,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        addFreeTimeCategory,
        deleteFreeTimeCategory,
        updateFreeTimeCategory,
        addFreeTimeTask,
        updateFreeTimeTask,
        deleteFreeTimeTask,
        moveFreeTimeTask,
        clearCompletedHomeTasks,
        clearCompletedWorkItems,
        clearCompletedFreeTimeTasks,
        addBlock,
        updateBlock,
        deleteBlock,
        exportData,
        importData,
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
