import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppContext } from "@/contexts/AppContext";
import type { Task, Subtask, RepeatInterval, TaskSubtype } from "@/types";
import { getIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  CheckSquare, Repeat, FolderPlus, Calendar,
} from "lucide-react-native";

const REPEAT_OPTIONS: { value: RepeatInterval; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "bimonthly", label: "Bimonthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

type TaskForm = {
  name: string; description: string; statusId: string; subtypeId: string;
  repeating: boolean; repeatInterval: RepeatInterval; dueDate: string; flagIds: string[];
};

export default function TasksPage() {
  const { typeId } = useLocalSearchParams<{ typeId: string }>();
  const {
    data, addTask, updateTask, deleteTask, reorderTask, clearCompletedTasks,
    addSubtask, updateSubtask, deleteSubtask,
    addTaskSubtype, updateTaskSubtype, deleteTaskSubtype, reorderTaskSubtype,
  } = useAppContext();

  const taskType = data.taskTypes.find((t) => t.id === typeId);
  if (!taskType) return <View className="flex-1 bg-background p-4"><Text className="text-foreground">Task type not found.</Text></View>;

  const Icon = getIcon(taskType.icon);
  const subtypes = [...taskType.subtypes].sort((a, b) => a.priority - b.priority);
  const getStatus = (id: string) => data.statuses.find((s) => s.id === id);
  const defaultStatusId = data.statuses.find((s) => !s.isComplete && !s.isInProgress)?.id ?? data.statuses[0]?.id ?? "";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const blankForm = (): TaskForm => ({
    name: "", description: "", statusId: defaultStatusId, subtypeId: subtypes[0]?.id ?? "",
    repeating: false, repeatInterval: "weekly", dueDate: "", flagIds: [],
  });
  const [form, setForm] = useState<TaskForm>(blankForm);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [subtaskParentId, setSubtaskParentId] = useState("");
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [subtaskForm, setSubtaskForm] = useState({ name: "", description: "", statusId: defaultStatusId });
  const [deleteSubtaskTarget, setDeleteSubtaskTarget] = useState<{ taskId: string; subtask: Subtask } | null>(null);

  const [subtypeDialogOpen, setSubtypeDialogOpen] = useState(false);
  const [editingSubtype, setEditingSubtype] = useState<TaskSubtype | null>(null);
  const [subtypeFormName, setSubtypeFormName] = useState("");
  const [deleteSubtypeTarget, setDeleteSubtypeTarget] = useState<TaskSubtype | null>(null);
  const [collapsedSubtypes, setCollapsedSubtypes] = useState<Set<string>>(new Set());

  const statusOptions = data.statuses.map((s) => ({ value: s.id, label: s.name, icon: <View className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} /> }));
  const subtypeOptions = subtypes.map((st) => ({ value: st.id, label: st.name }));

  const openAddTask = (subtypeId: string) => { setEditingTask(null); setForm({ ...blankForm(), subtypeId }); setDialogOpen(true); };
  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setForm({ name: task.name, description: task.description, statusId: task.statusId, subtypeId: task.subtypeId,
      repeating: task.repeating ?? false, repeatInterval: task.repeatInterval ?? "weekly", dueDate: task.dueDate ?? "", flagIds: task.flagIds ?? [] });
    setDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!form.name.trim()) return;
    const taskData = { name: form.name.trim(), description: form.description.trim(), statusId: form.statusId, subtypeId: form.subtypeId,
      repeating: form.repeating || undefined, repeatInterval: form.repeating ? form.repeatInterval : undefined, dueDate: form.dueDate || undefined };
    if (editingTask) updateTask({ ...editingTask, ...taskData, flagIds: form.flagIds });
    else addTask({ ...taskData, typeId: typeId!, priority: 0, flagIds: form.flagIds });
    setDialogOpen(false);
  };

  const toggleExpanded = (id: string) => setExpandedTasks((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSubtypeCollapsed = (id: string) => setCollapsedSubtypes((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const openAddSubtask = (taskId: string) => { setSubtaskParentId(taskId); setEditingSubtask(null); setSubtaskForm({ name: "", description: "", statusId: defaultStatusId }); setSubtaskDialogOpen(true); };
  const openEditSubtask = (taskId: string, subtask: Subtask) => { setSubtaskParentId(taskId); setEditingSubtask(subtask); setSubtaskForm({ name: subtask.name, description: subtask.description ?? "", statusId: subtask.statusId }); setSubtaskDialogOpen(true); };
  const handleSaveSubtask = () => {
    if (!subtaskForm.name.trim()) return;
    const sub = { name: subtaskForm.name.trim(), description: subtaskForm.description.trim(), statusId: subtaskForm.statusId };
    if (editingSubtask) updateSubtask(subtaskParentId, { ...editingSubtask, ...sub });
    else addSubtask(subtaskParentId, sub);
    setSubtaskDialogOpen(false);
  };

  const openAddSubtype = () => { setEditingSubtype(null); setSubtypeFormName(""); setSubtypeDialogOpen(true); };
  const openEditSubtype = (st: TaskSubtype) => { setEditingSubtype(st); setSubtypeFormName(st.name); setSubtypeDialogOpen(true); };
  const handleSaveSubtype = () => {
    if (!subtypeFormName.trim()) return;
    if (editingSubtype) updateTaskSubtype(typeId!, editingSubtype.id, subtypeFormName.trim());
    else addTaskSubtype(typeId!, subtypeFormName.trim());
    setSubtypeDialogOpen(false);
  };

  const hasCompleted = data.tasks.some((t) => t.typeId === typeId && getStatus(t.statusId)?.isComplete && !t.repeating);

  const renderTaskRow = (task: Task, tasksInSubtype: Task[]) => {
    const status = getStatus(task.statusId);
    const expanded = expandedTasks.has(task.id);
    const childSubtasks = task.subtasks;
    const completedSubs = childSubtasks.filter((s) => getStatus(s.statusId)?.isComplete).length;
    const idx = tasksInSubtype.findIndex((t) => t.id === task.id);
    const showOverdue = data.settings?.showOverdueIndicator ?? true;
    const isOverdue = showOverdue && task.dueDate && !status?.isComplete && new Date(task.dueDate) < new Date(new Date().toDateString());

    return (
      <View key={task.id} className="rounded-lg border border-border bg-card overflow-hidden">
        <View className="flex-row items-center gap-2 p-3" style={{ borderLeftWidth: 3, borderLeftColor: status?.color ?? '#4a8c4a' }}>
          <View className="gap-0.5">
            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0} onPress={() => reorderTask(task.id, "up")}>
              <ArrowUp size={12} color="#7a9f7a" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === tasksInSubtype.length - 1} onPress={() => reorderTask(task.id, "down")}>
              <ArrowDown size={12} color="#7a9f7a" />
            </Button>
          </View>
          <Pressable onPress={() => toggleExpanded(task.id)}>
            {expanded ? <ChevronDown size={16} color="#7a9f7a" /> : <ChevronRight size={16} color="#7a9f7a" />}
          </Pressable>
          <View className="flex-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className={`font-medium text-sm ${status?.isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.name}</Text>
              {task.dueDate && (
                <Badge variant="outline" className={isOverdue ? "border-red-500" : ""}>
                  <View className="flex-row items-center gap-1">
                    <Calendar size={10} color={isOverdue ? "#ef4444" : "#7a9f7a"} />
                    <Text className={`text-xs ${isOverdue ? "text-red-400" : "text-foreground"}`}>{isOverdue ? "Overdue · " : ""}{task.dueDate}</Text>
                  </View>
                </Badge>
              )}
              {task.repeating && (
                <Badge variant="outline">
                  <View className="flex-row items-center gap-1">
                    <Repeat size={10} color="#7a9f7a" />
                    <Text className="text-xs text-foreground">{REPEAT_OPTIONS.find((r) => r.value === task.repeatInterval)?.label ?? task.repeatInterval}</Text>
                  </View>
                </Badge>
              )}
              {childSubtasks.length > 0 && <Badge variant="outline"><Text className="text-xs text-foreground">{completedSubs}/{childSubtasks.length} subtasks</Text></Badge>}
            </View>
            {task.description ? <Text className="text-xs mt-0.5" style={{ color: status?.color ?? '#7a9f7a' }} numberOfLines={1}>{task.description}</Text> : null}
            {(task.flagIds ?? []).length > 0 && (
              <View className="flex-row gap-1 flex-wrap mt-1">
                {(task.flagIds ?? []).map((fid) => {
                  const flag = data.flags.find((f) => f.id === fid);
                  return flag ? (
                    <View key={fid} className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: flag.color + '25', borderWidth: 1, borderColor: flag.color + '50' }}>
                      <Text className="text-xs" style={{ color: flag.color }}>{flag.name}</Text>
                    </View>
                  ) : null;
                })}
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-1">
            <View className="flex-row items-center gap-1.5 rounded-md border border-border px-2 h-7">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: status?.color ?? '#888' }} />
              <Select value={task.statusId} onValueChange={(v) => updateTask({ ...task, statusId: v })} options={statusOptions} triggerClassName="h-7 border-0 px-0 min-w-[90px]" />
            </View>
            <Button variant="ghost" size="icon" onPress={() => openEditTask(task)}><Pencil size={14} color="#7a9f7a" /></Button>
            <Button variant="ghost" size="icon" onPress={() => setDeleteTarget(task)}><Trash2 size={14} color="#e57373" /></Button>
          </View>
        </View>

        {expanded && (
          <View className="border-t border-border p-3 bg-muted/30 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subtasks</Text>
              <Button variant="outline" size="sm" onPress={() => openAddSubtask(task.id)}>
                <View className="flex-row items-center gap-1"><Plus size={12} color="#7a9f7a" /><Text className="text-xs text-foreground">Add Subtask</Text></View>
              </Button>
            </View>
            {childSubtasks.length === 0 ? (
              <Text className="text-xs text-muted-foreground italic">No subtasks yet</Text>
            ) : (
              <View className="gap-1.5">
                {childSubtasks.map((sub) => {
                  const subStatus = getStatus(sub.statusId);
                  return (
                    <View key={sub.id} className="rounded border border-border bg-card p-2 flex-row items-center gap-2" style={{ borderLeftWidth: 2, borderLeftColor: subStatus?.color ?? '#4a8c4a' }}>
                      <View className="flex-1">
                        <Text className={`text-sm ${subStatus?.isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>{sub.name}</Text>
                        {sub.description ? <Text className="text-xs mt-0.5" style={{ color: subStatus?.color ?? '#7a9f7a' }} numberOfLines={1}>{sub.description}</Text> : null}
                      </View>
                      <View className="flex-row items-center gap-1.5 rounded border border-border px-1.5 h-6">
                        <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subStatus?.color ?? '#888' }} />
                        <Select value={sub.statusId} onValueChange={(v) => updateSubtask(task.id, { ...sub, statusId: v })} options={statusOptions} triggerClassName="h-6 border-0 px-0 min-w-[80px]" />
                      </View>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onPress={() => openEditSubtask(task.id, sub)}><Pencil size={12} color="#7a9f7a" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onPress={() => setDeleteSubtaskTarget({ taskId: task.id, subtask: sub })}><Trash2 size={12} color="#e57373" /></Button>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: taskType.color + "20" }}>
            <Icon size={20} color={taskType.color} />
          </View>
          <Text className="text-2xl font-bold text-foreground">{taskType.name}</Text>
        </View>
        <View className="flex-row gap-2">
          {hasCompleted && (
            <Button variant="outline" size="sm" onPress={() => clearCompletedTasks(typeId!)}>
              <View className="flex-row items-center gap-1"><CheckSquare size={14} color="#7a9f7a" /><Text className="text-xs text-foreground">Clear Done</Text></View>
            </Button>
          )}
          <Button variant="outline" size="sm" onPress={openAddSubtype}>
            <View className="flex-row items-center gap-1"><FolderPlus size={14} color="#7a9f7a" /><Text className="text-xs text-foreground">Add Subtype</Text></View>
          </Button>
        </View>
      </View>

      {subtypes.map((subtype, stIdx) => {
        const tasksInSubtype = data.tasks.filter((t) => t.typeId === typeId && t.subtypeId === subtype.id).sort((a, b) => a.priority - b.priority);
        const collapsed = collapsedSubtypes.has(subtype.id);
        const completedCount = tasksInSubtype.filter((t) => getStatus(t.statusId)?.isComplete).length;
        return (
          <View key={subtype.id} className="gap-2">
            <View className="flex-row items-center gap-2 pb-1 border-b border-border">
              <Pressable onPress={() => toggleSubtypeCollapsed(subtype.id)}>
                {collapsed ? <ChevronRight size={16} color="#7a9f7a" /> : <ChevronDown size={16} color="#7a9f7a" />}
              </Pressable>
              <Text className="text-sm font-semibold uppercase tracking-wide" style={{ color: taskType.color }}>{subtype.name}</Text>
              <Badge variant="outline"><Text className="text-xs text-foreground">{tasksInSubtype.length}{completedCount > 0 ? ` · ${completedCount} done` : ""}</Text></Badge>
              <View className="flex-1" />
              <View className="flex-row gap-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={stIdx === 0} onPress={() => reorderTaskSubtype(typeId!, subtype.id, "up")}><ArrowUp size={12} color="#7a9f7a" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={stIdx === subtypes.length - 1} onPress={() => reorderTaskSubtype(typeId!, subtype.id, "down")}><ArrowDown size={12} color="#7a9f7a" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onPress={() => openEditSubtype(subtype)}><Pencil size={12} color="#7a9f7a" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={subtypes.length <= 1} onPress={() => setDeleteSubtypeTarget(subtype)}><Trash2 size={12} color="#e57373" /></Button>
                <Button variant="ghost" size="sm" onPress={() => openAddTask(subtype.id)}>
                  <View className="flex-row items-center gap-1"><Plus size={12} color="#7a9f7a" /><Text className="text-xs text-foreground">Task</Text></View>
                </Button>
              </View>
            </View>
            {!collapsed && (tasksInSubtype.length === 0
              ? <Text className="text-xs text-muted-foreground italic pl-6">No tasks in this subtype</Text>
              : <View className="gap-2">{tasksInSubtype.map((task) => renderTaskRow(task, tasksInSubtype))}</View>
            )}
          </View>
        );
      })}

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle></DialogHeader>
          <View className="gap-4">
            <View><Label>Name</Label><Input value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} /></View>
            <View><Label>Description</Label><Textarea value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} /></View>
            <View><Label>Subtype</Label><Select value={form.subtypeId} onValueChange={(v) => setForm({ ...form, subtypeId: v })} options={subtypeOptions} /></View>
            <View>
              <Label>Status</Label>
              <Select
                value={form.statusId}
                onValueChange={(v) => setForm({ ...form, statusId: v })}
                options={statusOptions}
                renderTrigger={(selected) => (
                  <View className="flex-row items-center gap-2 flex-1">
                    {selected && <View className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.statuses.find((s) => s.id === selected.value)?.color ?? '#888' }} />}
                    <Text className="text-sm text-foreground flex-1">{selected?.label ?? "Select..."}</Text>
                  </View>
                )}
              />
            </View>
            <View><Label>Due Date</Label><DatePicker value={form.dueDate} onValueChange={(d) => setForm({ ...form, dueDate: d })} /></View>
            {data.flags.length > 0 && (
              <View>
                <Label>Flags</Label>
                <View className="flex-row flex-wrap gap-2 mt-2">
                  {data.flags.map((flag) => {
                    const active = form.flagIds.includes(flag.id);
                    return (
                      <Pressable key={flag.id} onPress={() => setForm({ ...form, flagIds: active ? form.flagIds.filter((id) => id !== flag.id) : [...form.flagIds, flag.id] })}
                        className={`px-2.5 py-1 rounded-full border ${active ? "border-transparent" : "border-border"}`}
                        style={active ? { backgroundColor: flag.color } : { borderColor: flag.color }}>
                        <Text className="text-xs font-medium" style={{ color: active ? "#0a0f0a" : flag.color }}>{flag.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            <View className="flex-row items-center gap-2">
              <Checkbox checked={form.repeating} onCheckedChange={(c) => setForm({ ...form, repeating: c })} />
              <Text className="text-sm text-foreground">Repeating Task</Text>
            </View>
            {form.repeating && (
              <View><Label>Repeat Interval</Label><Select value={form.repeatInterval} onValueChange={(v) => setForm({ ...form, repeatInterval: v as RepeatInterval })} options={REPEAT_OPTIONS} /></View>
            )}
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setDialogOpen(false)}><Text className="text-sm text-foreground">Cancel</Text></Button>
            <Button onPress={handleSaveTask} disabled={!form.name.trim()}><Text className="text-sm text-primary-foreground">Save</Text></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subtask Dialog */}
      <Dialog open={subtaskDialogOpen} onOpenChange={setSubtaskDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSubtask ? "Edit Subtask" : "Add Subtask"}</DialogTitle></DialogHeader>
          <View className="gap-4">
            <View><Label>Name</Label><Input value={subtaskForm.name} onChangeText={(t) => setSubtaskForm({ ...subtaskForm, name: t })} /></View>
            <View><Label>Description</Label><Textarea value={subtaskForm.description} onChangeText={(t) => setSubtaskForm({ ...subtaskForm, description: t })} /></View>
            <View>
              <Label>Status</Label>
              <Select
                value={subtaskForm.statusId}
                onValueChange={(v) => setSubtaskForm({ ...subtaskForm, statusId: v })}
                options={statusOptions}
                renderTrigger={(selected) => (
                  <View className="flex-row items-center gap-2 flex-1">
                    {selected && <View className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.statuses.find((s) => s.id === selected.value)?.color ?? '#888' }} />}
                    <Text className="text-sm text-foreground flex-1">{selected?.label ?? "Select..."}</Text>
                  </View>
                )}
              />
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setSubtaskDialogOpen(false)}><Text className="text-sm text-foreground">Cancel</Text></Button>
            <Button onPress={handleSaveSubtask} disabled={!subtaskForm.name.trim()}><Text className="text-sm text-primary-foreground">Save</Text></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subtype Dialog */}
      <Dialog open={subtypeDialogOpen} onOpenChange={setSubtypeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSubtype ? "Edit Subtype" : "Add Subtype"}</DialogTitle></DialogHeader>
          <View><Label>Name</Label><Input value={subtypeFormName} onChangeText={setSubtypeFormName} placeholder="e.g. Scheduled, Active, Backlog..." /></View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setSubtypeDialogOpen(false)}><Text className="text-sm text-foreground">Cancel</Text></Button>
            <Button onPress={handleSaveSubtype} disabled={!subtypeFormName.trim()}><Text className="text-sm text-primary-foreground">Save</Text></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Task</AlertDialogTitle><AlertDialogDescription>Delete "{deleteTarget?.name}" and all its subtasks?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onPress={() => { if (deleteTarget) { deleteTask(deleteTarget.id); setDeleteTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subtask */}
      <AlertDialog open={!!deleteSubtaskTarget} onOpenChange={(o) => !o && setDeleteSubtaskTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Subtask</AlertDialogTitle><AlertDialogDescription>Delete "{deleteSubtaskTarget?.subtask.name}"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setDeleteSubtaskTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onPress={() => { if (deleteSubtaskTarget) { deleteSubtask(deleteSubtaskTarget.taskId, deleteSubtaskTarget.subtask.id); setDeleteSubtaskTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subtype */}
      <AlertDialog open={!!deleteSubtypeTarget} onOpenChange={(o) => !o && setDeleteSubtypeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Subtype</AlertDialogTitle><AlertDialogDescription>Delete "{deleteSubtypeTarget?.name}"? Tasks will be moved to another subtype.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setDeleteSubtypeTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onPress={() => { if (deleteSubtypeTarget) { deleteTaskSubtype(typeId!, deleteSubtypeTarget.id); setDeleteSubtypeTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollView>
  );
}
