"use client";

import { useState, useCallback } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { TaskBlock, BlockTaskSlot, BlockTypeConfig, BlockSlotConfig } from "@/types";
import { getIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Shuffle, Dices, CheckCircle2, Trash2, Replace, Calendar, Settings, Plus,
  GripVertical, Pencil, SkipForward,
} from "lucide-react";

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function GenerateBlockPage() {
  const {
    data, addBlock, updateBlock, deleteBlock, updateTask, updateSubtask,
    addBlockTypeConfig, updateBlockTypeConfig, deleteBlockTypeConfig,
  } = useAppContext();

  const [showSettings, setShowSettings] = useState(false);
  const [editingConfig, setEditingConfig] = useState<BlockTypeConfig | null>(null);
  const [newConfigName, setNewConfigName] = useState("");

  const [manualSelectDialog, setManualSelectDialog] = useState<{
    blockId: string; slotIndex: number; typeId: string; flagId?: string;
  } | null>(null);
  const [manualSelection, setManualSelection] = useState("");
  const [manualSubSelection, setManualSubSelection] = useState("");

  // === Helpers ===
  const getTaskType = (id: string) => data.taskTypes.find((t) => t.id === id);
  const getTask = (id: string) => data.tasks.find((t) => t.id === id);
  const getStatus = (id: string) => data.statuses.find((s) => s.id === id);
  const getFlagName = (id?: string) => id ? (data.flags.find((f) => f.id === id)?.name ?? "") : "";
  const getFlagColor = (id?: string) => id ? (data.flags.find((f) => f.id === id)?.color ?? "#888") : "#888";

  // === Pick task for a slot ===
  // Flag rules:
  //   - Tasks with NO flags ("free tasks") are eligible for any slot.
  //   - Tasks WITH flags are only eligible for slots whose flagId matches one of their flags.
  //
  // For a FLAGGED slot, pass order (each pass sweeps ALL subtypes in priority order):
  //   Pass 1: flag-matched tasks only (exhausts entire priority list before moving on)
  //   Pass 2: free tasks only (no flags assigned)
  //   Pass 3: any rollable task (full fallback)
  //
  // For an UNFLAGGED slot:
  //   Pass 1: free tasks only
  //   Pass 2: any rollable task (full fallback)
  const pickTask = useCallback((
    typeId: string,
    excludeIds: Set<string>,
    flagId?: string,
    subtypeOrder?: string[]
  ): BlockTaskSlot | null => {
    const taskType = data.taskTypes.find((t) => t.id === typeId);
    if (!taskType) return null;

    const orderedSubtypeIds = subtypeOrder && subtypeOrder.length > 0
      ? subtypeOrder
      : [...taskType.subtypes].sort((a, b) => a.priority - b.priority).map((s) => s.id);

    const pickFrom = (pool: typeof data.tasks): BlockTaskSlot | null => {
      if (pool.length === 0) return null;
      const inProgress = pool.filter((t) => data.statuses.find((s) => s.id === t.statusId)?.isInProgress);
      const finalPool = inProgress.length > 0 ? inProgress : pool;
      const task = finalPool[Math.floor(Math.random() * finalPool.length)];
      const availableSubs = task.subtasks.filter((s) => !data.statuses.find((x) => x.id === s.statusId)?.isComplete);
      const subtaskId = availableSubs.length > 0
        ? availableSubs[Math.floor(Math.random() * availableSubs.length)].id
        : undefined;
      return { taskId: task.id, subtaskId, status: "active" };
    };

    const getRollable = (subtypeId: string) =>
      data.tasks.filter((t) => {
        const status = data.statuses.find((s) => s.id === t.statusId);
        return (
          t.typeId === typeId &&
          t.subtypeId === subtypeId &&
          !excludeIds.has(t.id) &&
          (status?.isRollable ?? true)
        );
      }).sort((a, b) => a.priority - b.priority);

    const sweepWith = (filter: (t: typeof data.tasks[0]) => boolean): BlockTaskSlot | null => {
      for (const subtypeId of orderedSubtypeIds) {
        const result = pickFrom(getRollable(subtypeId).filter(filter));
        if (result) return result;
      }
      return null;
    };

    // Pass 1 (flagged slots only): flag-matched tasks across all subtypes
    if (flagId) {
      const r = sweepWith((t) => (t.flagIds ?? []).includes(flagId));
      if (r) return r;
    }

    // Pass 2: free tasks (no flags) across all subtypes
    return sweepWith((t) => (t.flagIds ?? []).length === 0);
  }, [data.tasks, data.statuses, data.taskTypes]);

  // === Generate block ===
  const handleGenerateBlock = (configId: string) => {
    const config = data.blockSettings.find((c) => c.id === configId);
    if (!config) return;
    const existing = data.blocks.find((b) => b.blockConfigId === configId);
    const usedIds = new Set<string>();

    const slots: (BlockTaskSlot | null)[] = config.slots.map((cfg) => {
      const slot = pickTask(cfg.typeId, usedIds, cfg.flagId, cfg.subtypeOrder);
      if (slot) usedIds.add(slot.taskId);
      return slot;
    });

    const block: TaskBlock = { id: existing?.id ?? generateId(), blockConfigId: configId, slots };
    if (existing) updateBlock(block); else addBlock(block);
  };

  // === Reroll ===
  const handleReroll = (blockId: string, slotIndex: number) => {
    const block = data.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const config = data.blockSettings.find((c) => c.id === block.blockConfigId);
    const slotCfg = config?.slots[slotIndex];
    if (!slotCfg) return;

    const usedIds = new Set(block.slots.filter((s): s is BlockTaskSlot => !!s).map((s) => s.taskId));
    const current = block.slots[slotIndex];
    if (current) usedIds.delete(current.taskId);

    const newSlot = pickTask(slotCfg.typeId, usedIds, slotCfg.flagId, slotCfg.subtypeOrder);
    const newSlots = [...block.slots];
    newSlots[slotIndex] = newSlot;
    updateBlock({ ...block, slots: newSlots });
  };

  // === Mark slot ===
  const handleMarkSlot = (blockId: string, slotIndex: number, action: "complete" | "skip") => {
    const block = data.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const slot = block.slots[slotIndex];
    if (!slot) return;

    if (action === "complete") {
      const task = getTask(slot.taskId);
      if (task) {
        const completeStatus = data.statuses.find((s) => s.isComplete);
        if (completeStatus) updateTask({ ...task, statusId: completeStatus.id });
      }
    }

    const newSlots = [...block.slots];
    newSlots[slotIndex] = { ...slot, status: action === "complete" ? "complete" : "skipped" };
    updateBlock({ ...block, slots: newSlots });
  };

  // === Change task status directly from block ===
  const handleTaskStatusChange = (taskId: string, statusId: string) => {
    const task = getTask(taskId);
    if (!task) return;
    const newStatus = data.statuses.find((s) => s.id === statusId);
    updateTask({ ...task, statusId });
    // If marking complete, also mark the block slot complete
    if (newStatus?.isComplete) {
      data.blocks.forEach((block) => {
        const slotIdx = block.slots.findIndex((s) => s && s.taskId === taskId);
        if (slotIdx === -1) return;
        const slot = block.slots[slotIdx];
        if (slot && slot.status === "active") {
          const newSlots = [...block.slots];
          newSlots[slotIdx] = { ...slot, status: "complete" };
          updateBlock({ ...block, slots: newSlots });
        }
      });
    }
  };

  const handleSubtaskStatusChange = (taskId: string, subtaskId: string, statusId: string) => {
    const task = getTask(taskId);
    if (!task) return;
    const sub = task.subtasks.find((s) => s.id === subtaskId);
    if (sub) updateSubtask(taskId, { ...sub, statusId });
  };

  // === Manual select ===
  const confirmManualSelect = () => {
    if (!manualSelectDialog || !manualSelection) return;
    const block = data.blocks.find((b) => b.id === manualSelectDialog.blockId);
    if (!block) return;
    const newSlots = [...block.slots];
    newSlots[manualSelectDialog.slotIndex] = {
      taskId: manualSelection,
      subtaskId: manualSubSelection || undefined,
      status: "active",
    };
    updateBlock({ ...block, slots: newSlots });
    setManualSelectDialog(null);
  };

  // === Settings: slot editing ===
  const updateEditingSlot = (index: number, field: Partial<BlockSlotConfig>) => {
    if (!editingConfig) return;
    const newSlots = [...editingConfig.slots];
    newSlots[index] = { ...newSlots[index], ...field };
    setEditingConfig({ ...editingConfig, slots: newSlots });
  };

  const addEditingSlot = (typeId: string) => {
    if (!editingConfig) return;
    setEditingConfig({ ...editingConfig, slots: [...editingConfig.slots, { typeId }] });
  };

  const removeEditingSlot = (index: number) => {
    if (!editingConfig) return;
    const newSlots = [...editingConfig.slots];
    newSlots.splice(index, 1);
    setEditingConfig({ ...editingConfig, slots: newSlots });
  };

  const moveEditingSlot = (from: number, to: number) => {
    if (!editingConfig) return;
    const newSlots = [...editingConfig.slots];
    const [removed] = newSlots.splice(from, 1);
    newSlots.splice(to, 0, removed);
    setEditingConfig({ ...editingConfig, slots: newSlots });
  };

  const saveEditingConfig = () => {
    if (!editingConfig) return;
    updateBlockTypeConfig(editingConfig);
    setEditingConfig(null);
  };

  const handleAddNewConfig = () => {
    if (!newConfigName.trim()) return;
    const defaultTypeId = data.taskTypes[0]?.id || "";
    addBlockTypeConfig({ name: newConfigName.trim(), slots: [{ typeId: defaultTypeId }] });
    setNewConfigName("");
  };

  // === Render block section ===
  const renderBlockSection = (config: BlockTypeConfig) => {
    const block = data.blocks.find((b) => b.blockConfigId === config.id);

    return (
      <div key={config.id} className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-sky-400/30">
          <div className="flex items-center gap-2 font-semibold text-lg text-sky-400">
            <Calendar className="h-5 w-5" />{config.name}
          </div>
          <Button onClick={() => handleGenerateBlock(config.id)} size="sm">
            <Shuffle className="h-4 w-4 mr-2" />{block ? "Regenerate" : "Generate"}
          </Button>
        </div>

        {!block ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground"><p className="text-sm">No block generated yet</p></CardContent></Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{config.name}</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBlock(block.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {block.slots.map((slot, slotIdx) => {
                const slotCfg = config.slots[slotIdx];
                const taskType = slotCfg ? getTaskType(slotCfg.typeId) : null;
                const task = slot ? getTask(slot.taskId) : null;
                const TypeIcon = taskType ? getIcon(taskType.icon) : null;
                const flagName = getFlagName(slotCfg?.flagId);
                const taskStatus = task ? getStatus(task.statusId) : null;
                const isDone = slot?.status === "complete" || slot?.status === "skipped";

                return (
                  <div key={slotIdx} className={`rounded-lg border p-3 space-y-2 transition-opacity ${isDone ? "opacity-50 border-border" : "border-border"}`}>
                    {/* Slot header: type icon + name, flag badge, slot status */}
                    <div className="flex items-center gap-2">
                      {TypeIcon && <TypeIcon className="h-4 w-4 shrink-0" style={{ color: taskType?.color }} />}
                      <span className="text-xs font-semibold text-muted-foreground">{taskType?.name || "Unknown"}</span>
                      {flagName && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: getFlagColor(slotCfg?.flagId) }} />
                          {flagName}
                        </Badge>
                      )}
                      {isDone && <Badge variant="secondary" className="text-xs ml-auto capitalize">{slot?.status}</Badge>}
                    </div>

                    {!slot || !task ? (
                      <p className="text-sm text-muted-foreground italic">No task available</p>
                    ) : (
                      <>
                        {/* Task card */}
                        <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-2">
                          {/* Task name + status select */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-snug">{task.name}</p>
                              {task.description && (
                                <p className="text-xs mt-0.5 truncate" style={{ color: taskStatus?.color ?? "inherit" }}>{task.description}</p>
                              )}
                            </div>
                            {/* Status select */}
                            <Select value={task.statusId} onValueChange={(v) => v && handleTaskStatusChange(task.id, v)}>
                              <SelectTrigger className="h-6 w-auto min-w-[90px] text-xs shrink-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: taskStatus?.color }} />
                                  <span className="truncate">{taskStatus?.name}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {data.statuses.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    <div className="flex items-center gap-1.5">
                                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                      {s.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Flags */}
                          {(task.flagIds ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {(task.flagIds ?? []).map((fid) => {
                                const flag = data.flags.find((f) => f.id === fid);
                                return flag ? (
                                  <span key={fid} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: flag.color + "30", color: flag.color, border: `1px solid ${flag.color}60` }}>
                                    {flag.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}

                          {/* Subtasks */}
                          {task.subtasks.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-border/50">
                              {task.subtasks.map((sub) => {
                                const subStatus = getStatus(sub.statusId);
                                return (
                                  <div key={sub.id} className="flex items-center justify-between gap-2 rounded bg-muted/30 px-2 py-1">
                                    <span className={`text-xs flex-1 min-w-0 truncate ${subStatus?.isComplete ? "line-through text-muted-foreground" : ""}`}>{sub.name}</span>
                                    <Select value={sub.statusId} onValueChange={(v) => v && handleSubtaskStatusChange(task.id, sub.id, v)}>
                                      <SelectTrigger className="h-5 w-auto min-w-[80px] text-xs shrink-0">
                                        <div className="flex items-center gap-1">
                                          <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: subStatus?.color }} />
                                          <span className="truncate">{subStatus?.name}</span>
                                        </div>
                                      </SelectTrigger>
                                      <SelectContent>
                                        {data.statuses.map((s) => (
                                          <SelectItem key={s.id} value={s.id}>
                                            <div className="flex items-center gap-1.5">
                                              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                              {s.name}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Slot actions */}
                        {!isDone && (
                          <div className="flex gap-1.5 flex-wrap">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleMarkSlot(block.id, slotIdx, "complete")}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Done
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleMarkSlot(block.id, slotIdx, "skip")}>
                              <SkipForward className="h-3.5 w-3.5 mr-1" />Skip
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleReroll(block.id, slotIdx)}>
                              <Dices className="h-3.5 w-3.5 mr-1" />Reroll
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                              setManualSelectDialog({ blockId: block.id, slotIndex: slotIdx, typeId: slotCfg?.typeId || "", flagId: slotCfg?.flagId });
                              setManualSelection("");
                              setManualSubSelection("");
                            }}>
                              <Replace className="h-3.5 w-3.5 mr-1" />Pick
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Generate Block</h1>
        <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
          <Settings className="h-4 w-4 mr-2" />Manage Block Types
        </Button>
      </div>


      {data.blockSettings.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground"><p className="text-sm">No block types configured. Open &quot;Manage Block Types&quot; to add one.</p></CardContent></Card>
      )}

      {data.blockSettings.map((config) => renderBlockSection(config))}

      {/* Manage Block Types Dialog */}
      <Dialog open={showSettings} onOpenChange={(open) => { if (!open) { setShowSettings(false); setEditingConfig(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ maxWidth: "min(900px, calc(100vw - 2rem))" }}>
          <DialogHeader><DialogTitle>Manage Block Types</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {data.blockSettings.map((config) => (
              <div key={config.id} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-sky-400" />
                    <span className="font-semibold text-sm">{config.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingConfig(editingConfig?.id === config.id ? null : JSON.parse(JSON.stringify(config)))}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBlockTypeConfig(config.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                {editingConfig?.id === config.id && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input className="h-7 text-xs mt-1" value={editingConfig.name} onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Slots</Label>
                      {editingConfig.slots.map((cfg, idx) => {
                        const tt = getTaskType(cfg.typeId);
                        const ttSubtypes = tt ? [...tt.subtypes].sort((a, b) => a.priority - b.priority) : [];
                        // Build active subtype order: cfg.subtypeOrder if set, else default sort
                        const activeOrder: string[] = cfg.subtypeOrder && cfg.subtypeOrder.length > 0
                          ? cfg.subtypeOrder
                          : ttSubtypes.map((s) => s.id);
                        const moveSubtypeInSlot = (stIdx: number, dir: -1 | 1) => {
                          const newOrder = [...activeOrder];
                          const target = stIdx + dir;
                          if (target < 0 || target >= newOrder.length) return;
                          [newOrder[stIdx], newOrder[target]] = [newOrder[target], newOrder[stIdx]];
                          updateEditingSlot(idx, { subtypeOrder: newOrder });
                        };
                        return (
                          <div key={idx} className="rounded border border-border bg-muted/20 px-2 py-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                              <Select value={cfg.typeId} onValueChange={(v) => v && updateEditingSlot(idx, { typeId: v, subtypeOrder: undefined })}>
                                <SelectTrigger className="h-6 text-xs w-[120px]">
                                  <span>{tt?.name ?? <SelectValue />}</span>
                                </SelectTrigger>
                                <SelectContent>
                                  {data.taskTypes.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={cfg.flagId ?? "__none__"} onValueChange={(v) => updateEditingSlot(idx, { flagId: (v === "__none__" || !v) ? undefined : v ?? undefined })}>
                                <SelectTrigger className="h-6 text-xs flex-1">
                                  <div className="flex items-center gap-1.5">
                                    {cfg.flagId ? (
                                      <>
                                        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getFlagColor(cfg.flagId) }} />
                                        <span className="truncate">{getFlagName(cfg.flagId)}</span>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">No flag</span>
                                    )}
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">No flag filter</SelectItem>
                                  {data.flags.map((f) => (
                                    <SelectItem key={f.id} value={f.id}>
                                      <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />{f.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex gap-0.5 shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveEditingSlot(idx, idx - 1)}><span className="text-xs">↑</span></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === editingConfig.slots.length - 1} onClick={() => moveEditingSlot(idx, idx + 1)}><span className="text-xs">↓</span></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeEditingSlot(idx)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                            {ttSubtypes.length > 1 && (
                              <div className="pl-9 space-y-1">
                                <p className="text-xs text-muted-foreground">Roll priority (top = first tried):</p>
                                {activeOrder.map((stId, stIdx) => {
                                  const st = ttSubtypes.find((s) => s.id === stId);
                                  if (!st) return null;
                                  return (
                                    <div key={stId} className="flex items-center gap-1.5 rounded bg-muted/40 px-2 py-0.5">
                                      <span className="text-xs text-muted-foreground w-3">{stIdx + 1}.</span>
                                      <span className="text-xs flex-1">{st.name}</span>
                                      <Button variant="ghost" size="icon" className="h-5 w-5" disabled={stIdx === 0} onClick={() => moveSubtypeInSlot(stIdx, -1)}><span className="text-xs">↑</span></Button>
                                      <Button variant="ghost" size="icon" className="h-5 w-5" disabled={stIdx === activeOrder.length - 1} onClick={() => moveSubtypeInSlot(stIdx, 1)}><span className="text-xs">↓</span></Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {data.taskTypes.map((t) => (
                        <Button key={t.id} variant="outline" size="sm" className="h-6 text-xs" onClick={() => addEditingSlot(t.id)}>
                          <Plus className="h-3 w-3 mr-1" />{t.name}
                        </Button>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingConfig(null)}>Cancel</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={saveEditingConfig}>Save</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Block Type</p>
              <Input className="h-7 text-xs" placeholder="Name (e.g. Weekend, Morning...)" value={newConfigName} onChange={(e) => setNewConfigName(e.target.value)} />
              <Button size="sm" className="h-7 text-xs" disabled={!newConfigName.trim()} onClick={handleAddNewConfig}>
                <Plus className="h-3 w-3 mr-1" />Add Block Type
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowSettings(false); setEditingConfig(null); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Select Dialog */}
      <Dialog open={!!manualSelectDialog} onOpenChange={(open) => !open && setManualSelectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Select Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task</Label>
              <Select value={manualSelection} onValueChange={(v) => { setManualSelection(v || ""); setManualSubSelection(""); }}>
                <SelectTrigger><SelectValue placeholder="Select a task..." /></SelectTrigger>
                <SelectContent>
                  {data.tasks
                    .filter((t) => t.typeId === manualSelectDialog?.typeId)
                    .filter((t) => { const s = getStatus(t.statusId); return s && !s.isComplete; })
                    .sort((a, b) => a.priority - b.priority)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {manualSelection && (() => {
              const task = getTask(manualSelection);
              const subs = task?.subtasks.filter((s) => { const st = getStatus(s.statusId); return st && !st.isComplete; }) || [];
              if (subs.length === 0) return null;
              return (
                <div>
                  <Label>Subtask (optional)</Label>
                  <Select value={manualSubSelection || "__none__"} onValueChange={(v) => setManualSubSelection(!v || v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No subtask</SelectItem>
                      {subs.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualSelectDialog(null)}>Cancel</Button>
            <Button onClick={confirmManualSelect} disabled={!manualSelection}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
