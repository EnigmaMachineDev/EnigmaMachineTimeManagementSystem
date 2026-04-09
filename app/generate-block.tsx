import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { useAppContext } from "@/contexts/AppContext";
import type { BlockTypeConfig, BlockSlotConfig, BlockTaskSlot, TaskBlock } from "@/types";
import { getIcon } from "@/lib/icons";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/Dialog";
import {
  Plus, Pencil, Trash2, Shuffle, Play, SkipForward, Check, X, RefreshCw, Settings,
} from "lucide-react-native";

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function GenerateBlockPage() {
  const {
    data, addBlock, updateBlock, deleteBlock,
    addBlockTypeConfig, updateBlockTypeConfig, deleteBlockTypeConfig,
    updateTask, updateSubtask,
  } = useAppContext();

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<BlockTypeConfig | null>(null);
  const [configForm, setConfigForm] = useState<{ name: string; slots: BlockSlotConfig[] }>({ name: "", slots: [] });
  const [deleteConfigTarget, setDeleteConfigTarget] = useState<BlockTypeConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const typeOptions = data.taskTypes.map((t) => ({ value: t.id, label: t.name }));
  const flagOptions = [{ value: "", label: "Any" }, ...data.flags.map((f) => ({ value: f.id, label: f.name }))];

  const openAddConfig = () => { setEditingConfig(null); setConfigForm({ name: "", slots: [] }); setConfigDialogOpen(true); };
  const openEditConfig = (c: BlockTypeConfig) => { setEditingConfig(c); setConfigForm({ name: c.name, slots: [...c.slots] }); setConfigDialogOpen(true); };

  const handleSaveConfig = () => {
    if (!configForm.name.trim() || configForm.slots.length === 0) return;
    if (editingConfig) updateBlockTypeConfig({ ...editingConfig, name: configForm.name.trim(), slots: configForm.slots });
    else addBlockTypeConfig({ name: configForm.name.trim(), slots: configForm.slots });
    setConfigDialogOpen(false);
  };

  const addSlotToForm = () => {
    if (data.taskTypes.length === 0) return;
    setConfigForm((prev) => ({ ...prev, slots: [...prev.slots, { typeId: data.taskTypes[0].id }] }));
  };

  const removeSlotFromForm = (idx: number) => {
    setConfigForm((prev) => ({ ...prev, slots: prev.slots.filter((_, i) => i !== idx) }));
  };

  const updateSlotInForm = (idx: number, patch: Partial<BlockSlotConfig>) => {
    setConfigForm((prev) => ({
      ...prev,
      slots: prev.slots.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  // === Block Generation ===
  const pickTaskForSlot = (slot: BlockSlotConfig, usedTaskIds: Set<string>): BlockTaskSlot | null => {
    const rollableStatusIds = data.statuses.filter((s) => s.isRollable).map((s) => s.id);
    let candidates = data.tasks.filter((t) => {
      if (t.typeId !== slot.typeId) return false;
      if (!rollableStatusIds.includes(t.statusId)) return false;
      if (usedTaskIds.has(t.id)) return false;
      if (slot.flagId && !(t.flagIds ?? []).includes(slot.flagId)) return false;
      return true;
    });

    if (slot.subtypeOrder && slot.subtypeOrder.length > 0) {
      candidates.sort((a, b) => {
        const ai = slot.subtypeOrder!.indexOf(a.subtypeId);
        const bi = slot.subtypeOrder!.indexOf(b.subtypeId);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    } else {
      const taskType = data.taskTypes.find((tt) => tt.id === slot.typeId);
      if (taskType) {
        const subtypePriorityMap = new Map(taskType.subtypes.map((st) => [st.id, st.priority]));
        candidates.sort((a, b) => (subtypePriorityMap.get(a.subtypeId) ?? 999) - (subtypePriorityMap.get(b.subtypeId) ?? 999));
      }
    }

    candidates.sort((a, b) => a.priority - b.priority);

    if (candidates.length === 0) return null;
    const top = candidates[0];

    const rollableSubtasks = top.subtasks.filter((s) => rollableStatusIds.includes(s.statusId));
    if (rollableSubtasks.length > 0) {
      return { taskId: top.id, subtaskId: rollableSubtasks[0].id, status: "active" };
    }
    return { taskId: top.id, status: "active" };
  };

  const generateBlock = (configId: string) => {
    const config = data.blockSettings.find((c) => c.id === configId);
    if (!config) return;
    const usedTaskIds = new Set<string>();
    const slots: (BlockTaskSlot | null)[] = config.slots.map((slot) => {
      const picked = pickTaskForSlot(slot, usedTaskIds);
      if (picked) usedTaskIds.add(picked.taskId);
      return picked;
    });
    const block: TaskBlock = { id: generateId(), blockConfigId: configId, slots };
    addBlock(block);
  };

  const rerollSlot = (block: TaskBlock, slotIdx: number) => {
    const config = data.blockSettings.find((c) => c.id === block.blockConfigId);
    if (!config) return;
    const usedTaskIds = new Set(block.slots.filter((s): s is BlockTaskSlot => s !== null && s.status !== "skipped").map((s) => s.taskId));
    const oldSlot = block.slots[slotIdx];
    if (oldSlot) usedTaskIds.delete(oldSlot.taskId);
    const picked = pickTaskForSlot(config.slots[slotIdx], usedTaskIds);
    const newSlots = [...block.slots];
    newSlots[slotIdx] = picked;
    updateBlock({ ...block, slots: newSlots });
  };

  const markSlotComplete = (block: TaskBlock, slotIdx: number) => {
    const slot = block.slots[slotIdx];
    if (!slot) return;
    const completeStatus = data.statuses.find((s) => s.isComplete);
    if (completeStatus) {
      if (slot.subtaskId) {
        const task = data.tasks.find((t) => t.id === slot.taskId);
        const sub = task?.subtasks.find((s) => s.id === slot.subtaskId);
        if (task && sub) updateSubtask(task.id, { ...sub, statusId: completeStatus.id });
      } else {
        const task = data.tasks.find((t) => t.id === slot.taskId);
        if (task) updateTask({ ...task, statusId: completeStatus.id });
      }
    }
    const newSlots = [...block.slots];
    newSlots[slotIdx] = { ...slot, status: "complete" };
    updateBlock({ ...block, slots: newSlots });
  };

  const markSlotSkipped = (block: TaskBlock, slotIdx: number) => {
    const slot = block.slots[slotIdx];
    if (!slot) return;
    const newSlots = [...block.slots];
    newSlots[slotIdx] = { ...slot, status: "skipped" };
    updateBlock({ ...block, slots: newSlots });
  };

  const getTask = (id: string) => data.tasks.find((t) => t.id === id);
  const getType = (id: string) => data.taskTypes.find((t) => t.id === id);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-foreground">Generate Block</Text>
        <Button variant="outline" size="sm" onPress={() => setShowSettings(!showSettings)}>
          <View className="flex-row items-center gap-1">
            <Settings size={14} color="#7a9f7a" />
            <Text className="text-xs text-foreground">{showSettings ? "Hide" : "Settings"}</Text>
          </View>
        </Button>
      </View>

      {/* Block Type Configs (Settings) */}
      {showSettings && (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">Block Types</Text>
            <Button variant="outline" size="sm" onPress={openAddConfig}>
              <View className="flex-row items-center gap-1"><Plus size={12} color="#7a9f7a" /><Text className="text-xs text-foreground">New Block Type</Text></View>
            </Button>
          </View>
          {data.blockSettings.map((config) => (
            <Card key={config.id}>
              <CardContent className="pt-3 pb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-medium text-sm text-foreground">{config.name}</Text>
                  <View className="flex-row gap-1">
                    <Button variant="ghost" size="icon" onPress={() => openEditConfig(config)}><Pencil size={12} color="#7a9f7a" /></Button>
                    <Button variant="ghost" size="icon" onPress={() => setDeleteConfigTarget(config)}><Trash2 size={12} color="#e57373" /></Button>
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-1">
                  {config.slots.map((slot, i) => {
                    const type = getType(slot.typeId);
                    const flag = slot.flagId ? data.flags.find((f) => f.id === slot.flagId) : null;
                    return (
                      <Badge key={i} variant="outline">
                        <Text className="text-xs text-foreground">{type?.name ?? "?"}{flag ? ` (${flag.name})` : ""}</Text>
                      </Badge>
                    );
                  })}
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      )}

      {/* Generate Buttons */}
      <View className="gap-2">
        <Text className="text-sm font-semibold text-foreground">Generate</Text>
        <View className="flex-row flex-wrap gap-2">
          {data.blockSettings.map((config) => (
            <Button key={config.id} variant="outline" onPress={() => generateBlock(config.id)}>
              <View className="flex-row items-center gap-2">
                <Play size={14} color="#4a8c4a" />
                <Text className="text-sm text-foreground">{config.name}</Text>
              </View>
            </Button>
          ))}
          {data.blockSettings.length === 0 && (
            <Text className="text-sm text-muted-foreground italic">No block types configured. Open settings to add one.</Text>
          )}
        </View>
      </View>

      {/* Active Blocks */}
      {data.blocks.length > 0 && (
        <View className="gap-3">
          <Text className="text-sm font-semibold text-foreground">Active Blocks</Text>
          {[...data.blocks].reverse().map((block) => {
            const config = data.blockSettings.find((c) => c.id === block.blockConfigId);
            return (
              <Card key={block.id}>
                <CardContent className="pt-3 pb-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{config?.name ?? "Block"}</Text>
                    <Button variant="ghost" size="icon" onPress={() => deleteBlock(block.id)}><Trash2 size={14} color="#e57373" /></Button>
                  </View>
                  <View className="gap-2">
                    {block.slots.map((slot, i) => {
                      if (!slot) return (
                        <View key={i} className="rounded border border-border p-2 bg-muted/30">
                          <Text className="text-xs text-muted-foreground italic">No task available</Text>
                        </View>
                      );
                      const task = getTask(slot.taskId);
                      const subtask = slot.subtaskId ? task?.subtasks.find((s) => s.id === slot.subtaskId) : null;
                      const slotConfig = config?.slots[i];
                      const type = slotConfig ? getType(slotConfig.typeId) : null;
                      const Icon = type ? getIcon(type.icon) : null;
                      const isDone = slot.status === "complete";
                      const isSkipped = slot.status === "skipped";

                      return (
                        <View key={i} className={`rounded border p-2 flex-row items-center gap-2 ${isDone ? "border-green-700 bg-green-900/20" : isSkipped ? "border-border bg-muted/30" : "border-border bg-card"}`}>
                          {Icon && <Icon size={14} color={type?.color ?? "#7a9f7a"} />}
                          <View className="flex-1">
                            <Text className={`text-sm ${isDone ? "line-through text-muted-foreground" : isSkipped ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {task?.name ?? "Unknown"}{subtask ? ` → ${subtask.name}` : ""}
                            </Text>
                          </View>
                          {!isDone && !isSkipped && (
                            <View className="flex-row gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onPress={() => markSlotComplete(block, i)}><Check size={14} color="#22c55e" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onPress={() => markSlotSkipped(block, i)}><X size={14} color="#e57373" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onPress={() => rerollSlot(block, i)}><RefreshCw size={14} color="#7a9f7a" /></Button>
                            </View>
                          )}
                          {isDone && <Badge variant="outline"><Text className="text-xs text-green-400">Done</Text></Badge>}
                          {isSkipped && <Badge variant="outline"><Text className="text-xs text-muted-foreground">Skipped</Text></Badge>}
                        </View>
                      );
                    })}
                  </View>
                </CardContent>
              </Card>
            );
          })}
        </View>
      )}

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingConfig ? "Edit Block Type" : "New Block Type"}</DialogTitle></DialogHeader>
          <View className="gap-4">
            <View><Label>Name</Label><Input value={configForm.name} onChangeText={(t) => setConfigForm({ ...configForm, name: t })} placeholder="e.g. Weekend, Weekday..." /></View>
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Label>Slots</Label>
                <Button variant="outline" size="sm" onPress={addSlotToForm}>
                  <View className="flex-row items-center gap-1"><Plus size={12} color="#7a9f7a" /><Text className="text-xs text-foreground">Add Slot</Text></View>
                </Button>
              </View>
              {configForm.slots.length === 0 ? (
                <Text className="text-xs text-muted-foreground italic">No slots. Add at least one slot.</Text>
              ) : (
                <View className="gap-2">
                  {configForm.slots.map((slot, idx) => (
                    <View key={idx} className="flex-row items-center gap-2 rounded border border-border p-2 bg-muted/30">
                      <View className="flex-1 gap-1">
                        <Select value={slot.typeId} onValueChange={(v) => updateSlotInForm(idx, { typeId: v })} options={typeOptions} />
                        <Select value={slot.flagId ?? ""} onValueChange={(v) => updateSlotInForm(idx, { flagId: v || undefined })} options={flagOptions} />
                      </View>
                      <Button variant="ghost" size="icon" onPress={() => removeSlotFromForm(idx)}><Trash2 size={14} color="#e57373" /></Button>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setConfigDialogOpen(false)}><Text className="text-sm text-foreground">Cancel</Text></Button>
            <Button onPress={handleSaveConfig} disabled={!configForm.name.trim() || configForm.slots.length === 0}><Text className="text-sm text-primary-foreground">Save</Text></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Config */}
      <AlertDialog open={!!deleteConfigTarget} onOpenChange={(o) => !o && setDeleteConfigTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Block Type</AlertDialogTitle><AlertDialogDescription>Delete "{deleteConfigTarget?.name}"? Generated blocks of this type will also be removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setDeleteConfigTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onPress={() => { if (deleteConfigTarget) { deleteBlockTypeConfig(deleteConfigTarget.id); setDeleteConfigTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollView>
  );
}
