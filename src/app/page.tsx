"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppContext } from "@/contexts/AppContext";
import type { TaskType } from "@/types";
import { getIcon, ICON_NAMES, ICON_MAP } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, LayoutGrid } from "lucide-react";

export default function TaskTypesPage() {
  const { data, addTaskType, updateTaskType, deleteTaskType } = useAppContext();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<TaskType | null>(null);
  const [form, setForm] = useState({ name: "", icon: "Home", color: "#f97316" });
  const [deleteTarget, setDeleteTarget] = useState<TaskType | null>(null);

  const openAdd = () => {
    setEditingType(null);
    setForm({ name: "", icon: "Home", color: "#f97316" });
    setDialogOpen(true);
  };

  const openEdit = (type: TaskType) => {
    setEditingType(type);
    setForm({ name: type.name, icon: type.icon, color: type.color });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingType) {
      updateTaskType({ ...editingType, name: form.name.trim(), icon: form.icon, color: form.color });
    } else {
      addTaskType({ name: form.name.trim(), icon: form.icon, color: form.color, subtypes: [{ id: crypto.randomUUID(), name: "General", priority: 0 }] });
    }
    setDialogOpen(false);
  };

  const getTaskCount = (typeId: string) => data.tasks.filter((t) => t.typeId === typeId).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Task Types</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          New Type
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Create task types to organize your tasks. Click a type to view and manage its tasks.
      </p>

      {data.taskTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <LayoutGrid className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No task types yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.taskTypes.map((type) => {
            const Icon = getIcon(type.icon);
            const count = getTaskCount(type.id);
            const completedCount = data.tasks.filter((t) => {
              if (t.typeId !== type.id) return false;
              const status = data.statuses.find((s) => s.id === t.statusId);
              return status?.isComplete;
            }).length;

            return (
              <Card key={type.id} className="group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: type.color }} />
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: type.color + "20" }}
                      >
                        <Icon className="h-5 w-5" style={{ color: type.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{type.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {count} {count === 1 ? "task" : "tasks"}
                          {completedCount > 0 && ` · ${completedCount} done`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(type)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(type)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Link
                    href={`/tasks/${type.id}`}
                    className="block w-full text-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    View Tasks →
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Task Type" : "New Task Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Home Tasks, Work, Hobbies..."
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div>
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto rounded border border-border p-2">
                {ICON_NAMES.map((name) => {
                  const Ic = ICON_MAP[name];
                  return (
                    <button
                      key={name}
                      onClick={() => setForm({ ...form, icon: name })}
                      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${form.icon === name ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                      title={name}
                    >
                      <Ic className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent p-0.5 shrink-0"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="#rrggbb"
                  className="font-mono text-sm w-32"
                  maxLength={7}
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                {(() => { const Ic = getIcon(form.icon); return <Ic className="h-5 w-5" style={{ color: form.color }} />; })()}
                <span className="text-sm font-medium">{form.name || "Preview"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Type</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteTarget?.name}&quot;? All tasks of this type will also be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteTaskType(deleteTarget.id); setDeleteTarget(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
