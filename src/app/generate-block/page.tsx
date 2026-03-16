"use client";

import { useState, useCallback } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type {
  HomeTask,
  HomeTaskCategory,
  TaskBlock,
  BlockHomeSlot,
  BlockWorkSlot,
  BlockFreeTimeSlot,
  BlockSlotStatus,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shuffle,
  Dices,
  CheckCircle2,
  Clock,
  Ban,
  Trash2,
  ChevronRight,
  Home,
  Briefcase,
  Gamepad2,
  Replace,
} from "lucide-react";

// Home task priority order for block generation
const HOME_PRIORITY_ORDER: HomeTaskCategory[] = ["scheduled", "priority", "in-progress" as HomeTaskCategory, "repeating", "freelance", "misc"];
// Mapped display labels
const PRIORITY_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  priority: "Priority",
  "in-progress": "In Progress",
  repeating: "Repeating",
  freelance: "Freelance",
  misc: "Misc",
};

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function GenerateBlockPage() {
  const {
    data,
    addBlock,
    updateBlock,
    deleteBlock,
    updateHomeTask,
    updateSubtask,
    updateFreeTimeTask,
  } = useAppContext();

  const [blockedReasonDialog, setBlockedReasonDialog] = useState<{
    blockId: string;
    slotType: "home" | "work" | "freeTime";
  } | null>(null);
  const [blockedReason, setBlockedReason] = useState("");

  // Manual select state
  const [manualSelectDialog, setManualSelectDialog] = useState<{
    blockId: string;
    slotType: "home" | "work" | "freeTime";
  } | null>(null);
  const [manualSelection, setManualSelection] = useState("");
  const [manualSubSelection, setManualSubSelection] = useState("");

  // === Home task generation logic ===
  const getHomeTasksForPriority = useCallback(
    (priorityIndex: number): HomeTask[] => {
      const category = HOME_PRIORITY_ORDER[priorityIndex];
      if (!category) return [];

      if (category === "scheduled") {
        const today = new Date().toISOString().split("T")[0];
        return data.homeTasks.filter(
          (t) =>
            t.category === "scheduled" &&
            t.scheduledDate &&
            t.scheduledDate <= today &&
            t.status !== "complete" &&
            t.status !== "blocked"
        );
      }
      if ((category as string) === "in-progress") {
        return data.homeTasks.filter(
          (t) => t.status === "in-progress" && t.category !== "scheduled"
        );
      }
      if (category === "repeating") {
        return data.homeTasks.filter(
          (t) => t.category === "repeating" && t.status !== "complete" && t.status !== "blocked"
        );
      }
      return data.homeTasks.filter(
        (t) => t.category === category && t.status !== "complete" && t.status !== "blocked"
      );
    },
    [data.homeTasks]
  );

  const pickRandomHomeTask = useCallback(
    (startIndex: number = 0, excludeIds: Set<string> = new Set()): BlockHomeSlot | null => {
      for (let i = startIndex; i < HOME_PRIORITY_ORDER.length; i++) {
        const tasks = getHomeTasksForPriority(i).filter((t) => !excludeIds.has(t.id));
        if (tasks.length > 0) {
          const inProgress = tasks.filter((t) => t.status === "in-progress");
          const pool = inProgress.length > 0 ? inProgress : tasks;
          const task = pool[Math.floor(Math.random() * pool.length)];
          return { taskId: task.id, currentCategoryIndex: i, status: "active" };
        }
      }
      return null;
    },
    [getHomeTasksForPriority]
  );

  // === Work task generation logic ===
  const pickRandomWorkTask = useCallback((excludeItemIds: Set<string> = new Set()): BlockWorkSlot | null => {
    // Only consider items that have at least one rollable subtask (or no subtasks at all)
    const activeItems = data.workItems.filter((w) => {
      if (w.section !== "active" || excludeItemIds.has(w.id)) return false;
      if (w.subtasks.length === 0) return true;
      return w.subtasks.some((s) => s.status !== "complete" && s.status !== "blocked");
    });
    if (activeItems.length === 0) return null;
    // Prefer items that have at least one in-progress subtask
    const inProgressItems = activeItems.filter((w) => w.subtasks.some((s) => s.status === "in-progress"));
    const itemPool = inProgressItems.length > 0 ? inProgressItems : activeItems;
    const item = itemPool[Math.floor(Math.random() * itemPool.length)];
    const rollableSubtasks = item.subtasks.filter((s) => s.status !== "complete" && s.status !== "blocked");
    if (rollableSubtasks.length === 0) {
      if (item.subtasks.length === 0) {
        return { workItemId: item.id, subtaskId: "", status: "active" };
      }
      return null;
    }
    // Within the item, prefer in-progress subtasks
    const inProgressSubtasks = rollableSubtasks.filter((s) => s.status === "in-progress");
    const subtaskPool = inProgressSubtasks.length > 0 ? inProgressSubtasks : rollableSubtasks;
    const subtask = subtaskPool[Math.floor(Math.random() * subtaskPool.length)];
    return { workItemId: item.id, subtaskId: subtask.id, status: "active" };
  }, [data.workItems]);

  // === Free time task generation logic ===
  const pickRandomFreeTimeTask = useCallback((excludeIds: Set<string> = new Set()): BlockFreeTimeSlot | null => {
    const activeTasks = data.freeTimeTasks.filter((t) => t.section === "active" && (t.status ?? "incomplete") !== "blocked" && (t.status ?? "incomplete") !== "complete" && !excludeIds.has(t.id));
    if (activeTasks.length === 0) return null;
    const inProgress = activeTasks.filter((t) => t.status === "in-progress");
    const pool = inProgress.length > 0 ? inProgress : activeTasks;
    const task = pool[Math.floor(Math.random() * pool.length)];
    return { taskId: task.id, status: "active" };
  }, [data.freeTimeTasks]);

  // === Generate a new block ===
  const handleGenerateBlock = () => {
    if (data.blocks.length >= 3) return;
    const usedHomeIds = new Set(data.blocks.map((b) => b.homeSlot?.taskId).filter(Boolean) as string[]);
    const usedWorkIds = new Set(data.blocks.map((b) => b.workSlot?.workItemId).filter(Boolean) as string[]);
    const usedFreeTimeIds = new Set(data.blocks.map((b) => b.freeTimeSlot?.taskId).filter(Boolean) as string[]);
    const block: TaskBlock = {
      id: generateId(),
      homeSlot: pickRandomHomeTask(0, usedHomeIds),
      workSlot: pickRandomWorkTask(usedWorkIds),
      freeTimeSlot: pickRandomFreeTimeTask(usedFreeTimeIds),
    };
    addBlock(block);
  };

  // === Reroll ===
  const handleReroll = (blockId: string, slotType: "home" | "work" | "freeTime") => {
    const block = data.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const otherBlocks = data.blocks.filter((b) => b.id !== blockId);
    let updated: TaskBlock;
    if (slotType === "home") {
      const usedHomeIds = new Set(otherBlocks.map((b) => b.homeSlot?.taskId).filter(Boolean) as string[]);
      updated = { ...block, homeSlot: pickRandomHomeTask(block.homeSlot?.currentCategoryIndex ?? 0, usedHomeIds) };
    } else if (slotType === "work") {
      const usedWorkIds = new Set(otherBlocks.map((b) => b.workSlot?.workItemId).filter(Boolean) as string[]);
      updated = { ...block, workSlot: pickRandomWorkTask(usedWorkIds) };
    } else {
      const usedFreeTimeIds = new Set(otherBlocks.map((b) => b.freeTimeSlot?.taskId).filter(Boolean) as string[]);
      updated = { ...block, freeTimeSlot: pickRandomFreeTimeTask(usedFreeTimeIds) };
    }
    updateBlock(updated);
  };

  // === Next category for home task ===
  const handleNextCategory = (blockId: string) => {
    const block = data.blocks.find((b) => b.id === blockId);
    if (!block?.homeSlot) return;
    const nextIndex = block.homeSlot.currentCategoryIndex + 1;
    if (nextIndex >= HOME_PRIORITY_ORDER.length) return;
    const newSlot = pickRandomHomeTask(nextIndex);
    updateBlock({ ...block, homeSlot: newSlot });
  };

  // === Mark slot ===
  const handleMarkSlot = (blockId: string, slotType: "home" | "work" | "freeTime", status: BlockSlotStatus) => {
    if (status === "blocked") {
      setBlockedReasonDialog({ blockId, slotType });
      setBlockedReason("");
      return;
    }

    const block = data.blocks.find((b) => b.id === blockId);
    if (!block) return;

    applySlotMark(block, slotType, status);
  };

  const applySlotMark = (block: TaskBlock, slotType: "home" | "work" | "freeTime", status: BlockSlotStatus, reason?: string) => {
    // Apply status to underlying task
    if (slotType === "home" && block.homeSlot) {
      const task = data.homeTasks.find((t) => t.id === block.homeSlot!.taskId);
      if (task) {
        if (status === "complete") {
          updateHomeTask({ ...task, status: "complete" });
        } else if (status === "in-progress") {
          updateHomeTask({ ...task, status: "in-progress" });
        } else if (status === "blocked") {
          updateHomeTask({ ...task, status: "blocked", blockedReason: reason });
        }
      }
      updateBlock({ ...block, homeSlot: null });
    } else if (slotType === "work" && block.workSlot) {
      const workItem = data.workItems.find((w) => w.id === block.workSlot!.workItemId);
      if (workItem && block.workSlot.subtaskId) {
        const subtask = workItem.subtasks.find((s) => s.id === block.workSlot!.subtaskId);
        if (subtask) {
          if (status === "complete") {
            updateSubtask(workItem.id, { ...subtask, status: "complete" });
          } else if (status === "in-progress") {
            updateSubtask(workItem.id, { ...subtask, status: "in-progress" });
          }
        }
      }
      updateBlock({ ...block, workSlot: null });
    } else if (slotType === "freeTime" && block.freeTimeSlot) {
      const task = data.freeTimeTasks.find((t) => t.id === block.freeTimeSlot!.taskId);
      if (task) {
        if (status === "complete") {
          updateFreeTimeTask({ ...task, status: "complete" });
        } else if (status === "in-progress") {
          updateFreeTimeTask({ ...task, status: "in-progress" });
        } else if (status === "blocked") {
          updateFreeTimeTask({ ...task, status: "blocked", blockedReason: reason });
        }
      }
      updateBlock({ ...block, freeTimeSlot: null });
    }

    // Clean up empty blocks
    const updatedBlock = data.blocks.find((b) => b.id === block.id);
    if (updatedBlock && !updatedBlock.homeSlot && !updatedBlock.workSlot && !updatedBlock.freeTimeSlot) {
      // Block will be cleaned after state update
    }
  };

  const confirmBlocked = () => {
    if (!blockedReasonDialog || !blockedReason.trim()) return;
    const block = data.blocks.find((b) => b.id === blockedReasonDialog.blockId);
    if (!block) return;
    applySlotMark(block, blockedReasonDialog.slotType, "blocked", blockedReason.trim());
    setBlockedReasonDialog(null);
  };

  // === Manual select ===
  const openManualSelect = (blockId: string, slotType: "home" | "work" | "freeTime") => {
    setManualSelectDialog({ blockId, slotType });
    setManualSelection("");
    setManualSubSelection("");
  };

  const confirmManualSelect = () => {
    if (!manualSelectDialog || !manualSelection) return;
    const block = data.blocks.find((b) => b.id === manualSelectDialog.blockId);
    if (!block) return;

    if (manualSelectDialog.slotType === "home") {
      const task = data.homeTasks.find((t) => t.id === manualSelection);
      if (task) {
        const catIdx = HOME_PRIORITY_ORDER.indexOf(task.category);
        updateBlock({
          ...block,
          homeSlot: { taskId: task.id, currentCategoryIndex: catIdx >= 0 ? catIdx : 4, status: "active" },
        });
      }
    } else if (manualSelectDialog.slotType === "work") {
      updateBlock({
        ...block,
        workSlot: manualSelection
          ? { workItemId: manualSelection, subtaskId: manualSubSelection || "", status: "active" }
          : null,
      });
    } else {
      updateBlock({
        ...block,
        freeTimeSlot: manualSelection ? { taskId: manualSelection, status: "active" } : null,
      });
    }
    setManualSelectDialog(null);
  };

  // === Helpers ===
  const getHomeTaskName = (taskId: string) => data.homeTasks.find((t) => t.id === taskId)?.name || "Unknown Task";
  const getWorkItemName = (itemId: string) => data.workItems.find((w) => w.id === itemId)?.name || "Unknown Item";
  const getSubtaskName = (itemId: string, subtaskId: string) => {
    const item = data.workItems.find((w) => w.id === itemId);
    return item?.subtasks.find((s) => s.id === subtaskId)?.name || "No subtask";
  };
  const getFreeTimeTaskName = (taskId: string) => data.freeTimeTasks.find((t) => t.id === taskId)?.name || "Unknown Task";
  const getFreeTimeTaskCategory = (taskId: string) => {
    const task = data.freeTimeTasks.find((t) => t.id === taskId);
    if (!task) return "";
    return data.freeTimeCategories.find((c) => c.id === task.categoryId)?.name || "";
  };

  const isBlockEmpty = (block: TaskBlock) => !block.homeSlot && !block.workSlot && !block.freeTimeSlot;

  // Clean up empty blocks
  const activeBlocks = data.blocks.filter((b) => !isBlockEmpty(b));
  // Also keep blocks that still have slots even if some are null
  const displayBlocks = data.blocks;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Generate Block</h1>
        <Button onClick={handleGenerateBlock} disabled={data.blocks.length >= 3}>
          <Shuffle className="h-4 w-4 mr-2" />
          Generate Block ({data.blocks.length}/3)
        </Button>
      </div>

      {displayBlocks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shuffle className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No blocks generated yet</p>
            <p className="text-sm mt-1">Click &quot;Generate Block&quot; to create a task block</p>
          </CardContent>
        </Card>
      )}

      {displayBlocks.map((block, idx) => (
        <Card key={block.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Block {idx + 1}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => deleteBlock(block.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Home Task Slot */}
            <SlotCard
              icon={<Home className="h-4 w-4" />}
              label="Home Task"
              isEmpty={!block.homeSlot}
              taskName={block.homeSlot ? getHomeTaskName(block.homeSlot.taskId) : undefined}
              taskMeta={
                block.homeSlot
                  ? PRIORITY_LABELS[HOME_PRIORITY_ORDER[block.homeSlot.currentCategoryIndex]] || "Misc"
                  : undefined
              }
              onReroll={() => handleReroll(block.id, "home")}
              onManualSelect={() => openManualSelect(block.id, "home")}
              onMarkComplete={() => handleMarkSlot(block.id, "home", "complete")}
              onMarkInProgress={() => handleMarkSlot(block.id, "home", "in-progress")}
              onMarkBlocked={() => handleMarkSlot(block.id, "home", "blocked")}
              extraAction={
                block.homeSlot &&
                block.homeSlot.currentCategoryIndex < HOME_PRIORITY_ORDER.length - 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleNextCategory(block.id)}
                  >
                    <ChevronRight className="h-3.5 w-3.5 mr-1" />
                    Next Category
                  </Button>
                ) : undefined
              }
            />

            {/* Work Task Slot */}
            <SlotCard
              icon={<Briefcase className="h-4 w-4" />}
              label="Work Task"
              isEmpty={!block.workSlot}
              taskName={
                block.workSlot
                  ? `${getWorkItemName(block.workSlot.workItemId)}${block.workSlot.subtaskId ? ` → ${getSubtaskName(block.workSlot.workItemId, block.workSlot.subtaskId)}` : ""}`
                  : undefined
              }
              onReroll={() => handleReroll(block.id, "work")}
              onManualSelect={() => openManualSelect(block.id, "work")}
              onMarkComplete={() => handleMarkSlot(block.id, "work", "complete")}
              onMarkInProgress={() => handleMarkSlot(block.id, "work", "in-progress")}
              onMarkBlocked={() => handleMarkSlot(block.id, "work", "blocked")}
            />

            {/* Free Time Slot */}
            <SlotCard
              icon={<Gamepad2 className="h-4 w-4" />}
              label="Free Time Task"
              isEmpty={!block.freeTimeSlot}
              taskName={block.freeTimeSlot ? getFreeTimeTaskName(block.freeTimeSlot.taskId) : undefined}
              taskMeta={block.freeTimeSlot ? getFreeTimeTaskCategory(block.freeTimeSlot.taskId) : undefined}
              onReroll={() => handleReroll(block.id, "freeTime")}
              onManualSelect={() => openManualSelect(block.id, "freeTime")}
              onMarkComplete={() => handleMarkSlot(block.id, "freeTime", "complete")}
              onMarkInProgress={() => handleMarkSlot(block.id, "freeTime", "in-progress")}
              onMarkBlocked={() => handleMarkSlot(block.id, "freeTime", "blocked")}
            />
          </CardContent>
        </Card>
      ))}

      {/* Blocked Reason Dialog */}
      <Dialog open={!!blockedReasonDialog} onOpenChange={(open) => !open && setBlockedReasonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blocked Reason</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Why is this task blocked?</Label>
            <Textarea value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockedReasonDialog(null)}>Cancel</Button>
            <Button onClick={confirmBlocked} disabled={!blockedReason.trim()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Select Dialog */}
      <Dialog open={!!manualSelectDialog} onOpenChange={(open) => !open && setManualSelectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Select {manualSelectDialog?.slotType === "home" ? "Home" : manualSelectDialog?.slotType === "work" ? "Work" : "Free Time"} Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {manualSelectDialog?.slotType === "home" && (
              <div>
                <Label>Home Task</Label>
                <Select value={manualSelection} onValueChange={(v) => setManualSelection(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select a task..." /></SelectTrigger>
                  <SelectContent>
                    {data.homeTasks
                      .filter((t) => t.status !== "complete")
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          [{t.category}] {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {manualSelectDialog?.slotType === "work" && (
              <>
                <div>
                  <Label>Work Item</Label>
                  <Select value={manualSelection} onValueChange={(v) => { setManualSelection(v ?? ""); setManualSubSelection(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select a work item..." /></SelectTrigger>
                    <SelectContent>
                      {data.workItems
                        .filter((w) => w.section === "active")
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {manualSelection && (
                  <div>
                    <Label>Subtask</Label>
                    <Select value={manualSubSelection} onValueChange={(v) => setManualSubSelection(v ?? "")}>
                      <SelectTrigger><SelectValue placeholder="Select a subtask..." /></SelectTrigger>
                      <SelectContent>
                        {data.workItems
                          .find((w) => w.id === manualSelection)
                          ?.subtasks.filter((s) => s.status !== "complete")
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            {manualSelectDialog?.slotType === "freeTime" && (
              <div>
                <Label>Free Time Task</Label>
                <Select value={manualSelection} onValueChange={(v) => setManualSelection(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select a task..." /></SelectTrigger>
                  <SelectContent>
                    {data.freeTimeTasks
                      .filter((t) => t.section === "active")
                      .map((t) => {
                        const catName = data.freeTimeCategories.find((c) => c.id === t.categoryId)?.name || "";
                        return (
                          <SelectItem key={t.id} value={t.id}>
                            [{catName}] {t.name}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualSelectDialog(null)}>Cancel</Button>
            <Button onClick={confirmManualSelect} disabled={!manualSelection}>Select</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlotCard({
  icon,
  label,
  isEmpty,
  taskName,
  taskMeta,
  onReroll,
  onManualSelect,
  onMarkComplete,
  onMarkInProgress,
  onMarkBlocked,
  extraAction,
}: {
  icon: React.ReactNode;
  label: string;
  isEmpty: boolean;
  taskName?: string;
  taskMeta?: string;
  onReroll: () => void;
  onManualSelect: () => void;
  onMarkComplete: () => void;
  onMarkInProgress: () => void;
  onMarkBlocked: () => void;
  extraAction?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4 bg-muted/20">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
        {taskMeta && (
          <Badge variant="outline" className="text-xs">{taskMeta}</Badge>
        )}
      </div>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground italic">No task available</p>
      ) : (
        <>
          <p className="text-sm font-medium mb-3">{taskName}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onReroll}>
              <Dices className="h-3.5 w-3.5 mr-1" />
              Reroll
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onManualSelect}>
              <Replace className="h-3.5 w-3.5 mr-1" />
              Select
            </Button>
            <Button variant="default" size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={onMarkComplete}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Complete
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-300" onClick={onMarkInProgress}>
              <Clock className="h-3.5 w-3.5 mr-1" />
              In Progress
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-300" onClick={onMarkBlocked}>
              <Ban className="h-3.5 w-3.5 mr-1" />
              Blocked
            </Button>
            {extraAction}
          </div>
        </>
      )}
    </div>
  );
}
