"use client";

import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { Flag, Task, Subtask } from "@/types";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Flag as FlagIcon, ChevronDown, ChevronRight } from "lucide-react";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#a16207",
];

export default function FlagsPage() {
  const { data, addFlag, updateFlag, deleteFlag, updateTask, updateSubtask } = useAppContext();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<Flag | null>(null);
  const [form, setForm] = useState({ name: "", color: PRESET_COLORS[0] });
  const [deleteTarget, setDeleteTarget] = useState<Flag | null>(null);
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());

  const openAdd = () => { setEditingFlag(null); setForm({ name: "", color: PRESET_COLORS[0] }); setDialogOpen(true); };
  const openEdit = (flag: Flag) => { setEditingFlag(flag); setForm({ name: flag.name, color: flag.color }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingFlag) updateFlag({ ...editingFlag, name: form.name.trim(), color: form.color });
    else addFlag({ name: form.name.trim(), color: form.color });
    setDialogOpen(false);
  };

  const toggleFlagExpanded = (id: string) => {
    setExpandedFlags((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleTaskFlag = (task: Task, flagId: string) => {
    const flagIds = task.flagIds ?? [];
    const next = flagIds.includes(flagId) ? flagIds.filter((f) => f !== flagId) : [...flagIds, flagId];
    updateTask({ ...task, flagIds: next });
  };

  const toggleSubtaskFlag = (taskId: string, subtask: Subtask, flagId: string) => {
    const flagIds = subtask.flagIds ?? [];
    const next = flagIds.includes(flagId) ? flagIds.filter((f) => f !== flagId) : [...flagIds, flagId];
    updateSubtask(taskId, { ...subtask, flagIds: next });
  };

  const getTaskCount = (flagId: string) => {
    const tasks = data.tasks.filter((t) => (t.flagIds ?? []).includes(flagId)).length;
    const subtasks = data.tasks.flatMap((t) => t.subtasks).filter((s) => (s.flagIds ?? []).includes(flagId)).length;
    return tasks + subtasks;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Flags</h1>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />New Flag</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Flags can be applied to any task or subtask. On the Generate Block page, you can assign a flag filter per slot so the generator prioritises flagged tasks first.
      </p>

      {data.flags.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FlagIcon className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No flags yet. Create one to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {data.flags.map((flag) => {
            const expanded = expandedFlags.has(flag.id);
            const count = getTaskCount(flag.id);
            return (
              <Card key={flag.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <button className="flex items-center gap-3 flex-1 text-left" onClick={() => toggleFlagExpanded(flag.id)}>
                      {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: flag.color }} />
                      <CardTitle className="text-base">{flag.name}</CardTitle>
                      <Badge variant="outline" className="text-xs ml-1">{count} {count === 1 ? "task" : "tasks"}</Badge>
                    </button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(flag)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(flag)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardHeader>

                {expanded && (
                  <CardContent className="pt-0 space-y-6">
                    {data.taskTypes.map((type) => {
                      const typeTasks = data.tasks.filter((t) => t.typeId === type.id);
                      if (typeTasks.length === 0) return null;
                      const TypeIcon = getIcon(type.icon);
                      return (
                        <div key={type.id} className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <TypeIcon className="h-3.5 w-3.5" />{type.name}
                          </div>
                          <div className="space-y-1">
                            {typeTasks.map((task) => {
                              const hasFlag = (task.flagIds ?? []).includes(flag.id);
                              return (
                                <div key={task.id} className="space-y-1">
                                  <button
                                    onClick={() => toggleTaskFlag(task, flag.id)}
                                    className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm text-left transition-colors ${hasFlag ? "bg-accent" : "hover:bg-muted/50"}`}
                                  >
                                    <span className={`inline-block w-2.5 h-2.5 rounded-sm border-2 shrink-0 ${hasFlag ? "border-transparent" : "border-muted-foreground/40"}`} style={hasFlag ? { backgroundColor: flag.color } : {}} />
                                    <span className={hasFlag ? "font-medium" : "text-muted-foreground"}>{task.name}</span>
                                  </button>
                                  {task.subtasks.map((sub) => {
                                    const subHas = (sub.flagIds ?? []).includes(flag.id);
                                    return (
                                      <button key={sub.id} onClick={() => toggleSubtaskFlag(task.id, sub, flag.id)}
                                        className={`w-full flex items-center gap-2 rounded px-2 py-1 text-xs text-left transition-colors ml-4 ${subHas ? "bg-accent" : "hover:bg-muted/50"}`}
                                      >
                                        <span className={`inline-block w-2 h-2 rounded-sm border-2 shrink-0 ${subHas ? "border-transparent" : "border-muted-foreground/40"}`} style={subHas ? { backgroundColor: flag.color } : {}} />
                                        <span className={subHas ? "font-medium" : "text-muted-foreground"}>{sub.name}</span>
                                        <span className="text-xs text-muted-foreground ml-auto">subtask</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {data.tasks.length === 0 && <p className="text-sm text-muted-foreground italic">No tasks exist yet.</p>}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingFlag ? "Edit Flag" : "New Flag"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekend Only, Urgent..." onKeyDown={(e) => e.key === "Enter" && handleSave()} /></div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button key={color} onClick={() => setForm({ ...form, color })} className={`w-7 h-7 rounded-full transition-transform ${form.color === color ? "scale-125 ring-2 ring-offset-2 ring-offset-background ring-white" : "hover:scale-110"}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flag</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{deleteTarget?.name}&quot;? It will be removed from all tasks. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteFlag(deleteTarget.id); setDeleteTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
