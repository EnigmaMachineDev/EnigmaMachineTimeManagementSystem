"use client";

import { useState } from "react";
import { useParams, notFound } from "next/navigation";
import { useAppContext } from "@/contexts/AppContext";
import type { Task, Subtask, RepeatInterval, TaskSubtype } from "@/types";
import { getIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  CheckSquare, Repeat, FolderPlus, Calendar,
} from "lucide-react";

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
  name: string;
  description: string;
  statusId: string;
  subtypeId: string;
  repeating: boolean;
  repeatInterval: RepeatInterval;
  dueDate: string;
  flagIds: string[];
};

export default function TasksPage() {
  const params = useParams();
  const typeId = params.typeId as string;
  const {
    data, addTask, updateTask, deleteTask, reorderTask, clearCompletedTasks,
    addSubtask, updateSubtask, deleteSubtask,
    addTaskSubtype, updateTaskSubtype, deleteTaskSubtype, reorderTaskSubtype,
  } = useAppContext();

  const taskType = data.taskTypes.find((t) => t.id === typeId);
  if (!taskType) return notFound();

  const Icon = getIcon(taskType.icon);
  const subtypes = [...taskType.subtypes].sort((a, b) => a.priority - b.priority);

  const getStatus = (id: string) => data.statuses.find((s) => s.id === id);
  const defaultStatusId = data.statuses.find((s) => !s.isComplete && !s.isInProgress)?.id ?? data.statuses[0]?.id ?? "";

  // ── Task dialog ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const blankForm = (): TaskForm => ({
    name: "", description: "", statusId: defaultStatusId, subtypeId: subtypes[0]?.id ?? "",
    repeating: false, repeatInterval: "weekly", dueDate: "", flagIds: [],
  });
  const [form, setForm] = useState<TaskForm>(blankForm);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // ── Subtask dialog ──
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [subtaskParentId, setSubtaskParentId] = useState("");
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [subtaskForm, setSubtaskForm] = useState({ name: "", statusId: defaultStatusId });
  const [deleteSubtaskTarget, setDeleteSubtaskTarget] = useState<{ taskId: string; subtask: Subtask } | null>(null);

  // ── Subtype management ──
  const [subtypeDialogOpen, setSubtypeDialogOpen] = useState(false);
  const [editingSubtype, setEditingSubtype] = useState<TaskSubtype | null>(null);
  const [subtypeFormName, setSubtypeFormName] = useState("");
  const [deleteSubtypeTarget, setDeleteSubtypeTarget] = useState<TaskSubtype | null>(null);

  const [collapsedSubtypes, setCollapsedSubtypes] = useState<Set<string>>(new Set());

  // ── Helpers ──
  const openAddTask = (subtypeId: string) => {
    setEditingTask(null);
    setForm({ ...blankForm(), subtypeId });
    setDialogOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setForm({
      name: task.name,
      description: task.description,
      statusId: task.statusId,
      subtypeId: task.subtypeId,
      repeating: task.repeating ?? false,
      repeatInterval: task.repeatInterval ?? "weekly",
      dueDate: task.dueDate ?? "",
      flagIds: task.flagIds ?? [],
    });
    setDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!form.name.trim()) return;
    const taskData = {
      name: form.name.trim(),
      description: form.description.trim(),
      statusId: form.statusId,
      subtypeId: form.subtypeId,
      repeating: form.repeating || undefined,
      repeatInterval: form.repeating ? form.repeatInterval : undefined,
      dueDate: form.dueDate || undefined,
    };
    if (editingTask) {
      updateTask({ ...editingTask, ...taskData, flagIds: form.flagIds });
    } else {
      addTask({ ...taskData, typeId, priority: 0, flagIds: form.flagIds });
    }
    setDialogOpen(false);
  };

  const toggleExpanded = (id: string) => {
    setExpandedTasks((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const toggleSubtypeCollapsed = (id: string) => {
    setCollapsedSubtypes((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const openAddSubtask = (taskId: string) => {
    setSubtaskParentId(taskId);
    setEditingSubtask(null);
    setSubtaskForm({ name: "", statusId: defaultStatusId });
    setSubtaskDialogOpen(true);
  };

  const openEditSubtask = (taskId: string, subtask: Subtask) => {
    setSubtaskParentId(taskId);
    setEditingSubtask(subtask);
    setSubtaskForm({ name: subtask.name, statusId: subtask.statusId });
    setSubtaskDialogOpen(true);
  };

  const handleSaveSubtask = () => {
    if (!subtaskForm.name.trim()) return;
    const sub = { name: subtaskForm.name.trim(), statusId: subtaskForm.statusId };
    if (editingSubtask) updateSubtask(subtaskParentId, { ...editingSubtask, ...sub });
    else addSubtask(subtaskParentId, sub);
    setSubtaskDialogOpen(false);
  };

  const openAddSubtype = () => { setEditingSubtype(null); setSubtypeFormName(""); setSubtypeDialogOpen(true); };
  const openEditSubtype = (st: TaskSubtype) => { setEditingSubtype(st); setSubtypeFormName(st.name); setSubtypeDialogOpen(true); };
  const handleSaveSubtype = () => {
    if (!subtypeFormName.trim()) return;
    if (editingSubtype) updateTaskSubtype(typeId, editingSubtype.id, subtypeFormName.trim());
    else addTaskSubtype(typeId, subtypeFormName.trim());
    setSubtypeDialogOpen(false);
  };

  const hasCompleted = data.tasks.some((t) => {
    if (t.typeId !== typeId) return false;
    return getStatus(t.statusId)?.isComplete && !t.repeating;
  });

  // ── Inline status select ──
  const renderStatusSelect = (currentId: string, onChange: (id: string) => void, width = "w-[140px]") => {
    const current = getStatus(currentId);
    return (
      <Select value={currentId} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className={`h-8 ${width} text-xs`}>
          {current ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: current.color }} />
              <span className="truncate">{current.name}</span>
            </div>
          ) : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          {data.statuses.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  // ── Task row ──
  const renderTaskRow = (task: Task, tasksInSubtype: Task[]) => {
    const status = getStatus(task.statusId);
    const expanded = expandedTasks.has(task.id);
    const childSubtasks = task.subtasks;
    const completedSubs = childSubtasks.filter((s) => getStatus(s.statusId)?.isComplete).length;
    const idx = tasksInSubtype.findIndex((t) => t.id === task.id);
    const isOverdue = task.dueDate && !status?.isComplete && new Date(task.dueDate) < new Date(new Date().toDateString());

    return (
      <div key={task.id} className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 p-3">
          <div className="flex flex-col gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0} onClick={() => reorderTask(task.id, "up")}>
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === tasksInSubtype.length - 1} onClick={() => reorderTask(task.id, "down")}>
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
          <button onClick={() => toggleExpanded(task.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium text-sm ${status?.isComplete ? "line-through text-muted-foreground" : ""}`}>{task.name}</span>
              {task.dueDate && (
                <Badge variant="outline" className={`text-xs gap-1 ${isOverdue ? "border-red-500 text-red-400" : ""}`}>
                  <Calendar className="h-3 w-3" />
                  {isOverdue ? "Overdue · " : ""}{task.dueDate}
                </Badge>
              )}
              {task.repeating && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Repeat className="h-3 w-3" />
                  {REPEAT_OPTIONS.find((r) => r.value === task.repeatInterval)?.label ?? task.repeatInterval}
                </Badge>
              )}
              {childSubtasks.length > 0 && (
                <Badge variant="outline" className="text-xs">{completedSubs}/{childSubtasks.length} subtasks</Badge>
              )}
              {(task.flagIds ?? []).length > 0 && (
                <div className="flex gap-1 flex-wrap">
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
            </div>
            {task.description && (
              <p className="text-xs mt-0.5 truncate" style={{ color: status?.color ?? "inherit" }}>{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {renderStatusSelect(task.statusId, (v) => updateTask({ ...task, statusId: v }))}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTask(task)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(task)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border p-3 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subtasks</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddSubtask(task.id)}>
                <Plus className="h-3 w-3 mr-1" />Add Subtask
              </Button>
            </div>
            {childSubtasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No subtasks yet</p>
            ) : (
              <div className="space-y-1.5">
                {childSubtasks.map((sub) => {
                  const subStatus = getStatus(sub.statusId);
                  return (
                    <div key={sub.id} className="rounded border border-border bg-card p-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${subStatus?.isComplete ? "line-through text-muted-foreground" : ""}`}>{sub.name}</span>
                      </div>
                      {renderStatusSelect(sub.statusId, (v) => updateSubtask(task.id, { ...sub, statusId: v }), "w-[120px]")}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSubtask(task.id, sub)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteSubtaskTarget({ taskId: task.id, subtask: sub })}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const selectedSubtypeName = subtypes.find((s) => s.id === form.subtypeId)?.name ?? "";
  const selectedStatus = getStatus(form.statusId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: taskType.color + "20" }}>
            <Icon className="h-5 w-5" style={{ color: taskType.color }} />
          </div>
          <h1 className="text-2xl font-bold">{taskType.name}</h1>
        </div>
        <div className="flex gap-2">
          {hasCompleted && (
            <Button variant="outline" size="sm" onClick={() => clearCompletedTasks(typeId)}>
              <CheckSquare className="h-4 w-4 mr-2" />Clear Completed
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={openAddSubtype}>
            <FolderPlus className="h-4 w-4 mr-2" />Add Subtype
          </Button>
        </div>
      </div>

      {/* Subtype sections */}
      {subtypes.map((subtype, stIdx) => {
        const tasksInSubtype = data.tasks
          .filter((t) => t.typeId === typeId && t.subtypeId === subtype.id)
          .sort((a, b) => a.priority - b.priority);
        const collapsed = collapsedSubtypes.has(subtype.id);
        const completedCount = tasksInSubtype.filter((t) => getStatus(t.statusId)?.isComplete).length;

        return (
          <div key={subtype.id} className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-border">
              <button onClick={() => toggleSubtypeCollapsed(subtype.id)} className="text-muted-foreground hover:text-foreground">
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: taskType.color }}>{subtype.name}</h2>
              <Badge variant="outline" className="text-xs">
                {tasksInSubtype.length}{completedCount > 0 ? ` · ${completedCount} done` : ""}
              </Badge>
              <div className="flex-1" />
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={stIdx === 0} onClick={() => reorderTaskSubtype(typeId, subtype.id, "up")}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={stIdx === subtypes.length - 1} onClick={() => reorderTaskSubtype(typeId, subtype.id, "down")}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditSubtype(subtype)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" disabled={subtypes.length <= 1} onClick={() => setDeleteSubtypeTarget(subtype)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => openAddTask(subtype.id)}>
                  <Plus className="h-3 w-3 mr-1" />Task
                </Button>
              </div>
            </div>
            {!collapsed && (
              tasksInSubtype.length === 0 ? (
                <p className="text-xs text-muted-foreground italic pl-6">No tasks in this subtype</p>
              ) : (
                <div className="space-y-2">
                  {tasksInSubtype.map((task) => renderTaskRow(task, tasksInSubtype))}
                </div>
              )
            )}
          </div>
        );
      })}

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description <span className="text-muted-foreground font-normal text-xs">(optional — shown in status color)</span></Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div>
              <Label>Subtype</Label>
              <Select value={form.subtypeId} onValueChange={(v) => v && setForm({ ...form, subtypeId: v })}>
                <SelectTrigger><span>{selectedSubtypeName || <SelectValue />}</span></SelectTrigger>
                <SelectContent>
                  {subtypes.map((st) => (<SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.statusId} onValueChange={(v) => v && setForm({ ...form, statusId: v })}>
                <SelectTrigger>
                  <div className="flex items-center gap-1.5">
                    {selectedStatus && <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedStatus.color }} />}
                    <span>{selectedStatus?.name ?? <SelectValue />}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {data.statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>

            {data.flags.length > 0 && (
              <div>
                <Label>Flags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.flags.map((flag) => {
                    const active = form.flagIds.includes(flag.id);
                    return (
                      <button
                        key={flag.id}
                        type="button"
                        onClick={() => setForm({ ...form, flagIds: active ? form.flagIds.filter((id) => id !== flag.id) : [...form.flagIds, flag.id] })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          active ? "border-transparent text-background" : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                        style={active ? { backgroundColor: flag.color } : { borderColor: flag.color, color: flag.color }}
                      >
                        {flag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox id="repeating" checked={form.repeating} onCheckedChange={(c) => setForm({ ...form, repeating: c === true })} />
              <Label htmlFor="repeating" className="text-sm font-normal cursor-pointer">Repeating Task</Label>
            </div>
            {form.repeating && (
              <div>
                <Label>Repeat Interval</Label>
                <Select value={form.repeatInterval} onValueChange={(v) => v && setForm({ ...form, repeatInterval: v as RepeatInterval })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPEAT_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTask} disabled={!form.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subtask Dialog */}
      <Dialog open={subtaskDialogOpen} onOpenChange={setSubtaskDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingSubtask ? "Edit Subtask" : "Add Subtask"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={subtaskForm.name} onChange={(e) => setSubtaskForm({ ...subtaskForm, name: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={subtaskForm.statusId} onValueChange={(v) => v && setSubtaskForm({ ...subtaskForm, statusId: v })}>
                <SelectTrigger>
                  <div className="flex items-center gap-1.5">
                    {getStatus(subtaskForm.statusId) && (
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStatus(subtaskForm.statusId)!.color }} />
                    )}
                    <span>{getStatus(subtaskForm.statusId)?.name ?? <SelectValue />}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {data.statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubtaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubtask} disabled={!subtaskForm.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subtype Dialog */}
      <Dialog open={subtypeDialogOpen} onOpenChange={setSubtypeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingSubtype ? "Edit Subtype" : "Add Subtype"}</DialogTitle></DialogHeader>
          <div>
            <Label>Name</Label>
            <Input value={subtypeFormName} onChange={(e) => setSubtypeFormName(e.target.value)} placeholder="e.g. Scheduled, Active, Backlog..." onKeyDown={(e) => e.key === "Enter" && handleSaveSubtype()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubtypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubtype} disabled={!subtypeFormName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{deleteTarget?.name}&quot; and all its subtasks?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteTask(deleteTarget.id); setDeleteTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subtask */}
      <AlertDialog open={!!deleteSubtaskTarget} onOpenChange={(open) => !open && setDeleteSubtaskTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subtask</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{deleteSubtaskTarget?.subtask.name}&quot;?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteSubtaskTarget) { deleteSubtask(deleteSubtaskTarget.taskId, deleteSubtaskTarget.subtask.id); setDeleteSubtaskTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subtype */}
      <AlertDialog open={!!deleteSubtypeTarget} onOpenChange={(open) => !open && setDeleteSubtypeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subtype</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{deleteSubtypeTarget?.name}&quot;? Tasks in this subtype will be moved to another subtype.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteSubtypeTarget) { deleteTaskSubtype(typeId, deleteSubtypeTarget.id); setDeleteSubtypeTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
