"use client";

import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { CustomStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, CircleDot } from "lucide-react";

const DEFAULT_STATUS_IDS = ["status-incomplete", "status-in-progress", "status-complete", "status-blocked"];

export default function StatusesPage() {
  const { data, addStatus, updateStatus, deleteStatus } = useAppContext();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomStatus | null>(null);
  const [form, setForm] = useState({ name: "", color: "#eab308", isComplete: false, isInProgress: false, isRollable: true });
  const [deleteTarget, setDeleteTarget] = useState<CustomStatus | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", color: "#eab308", isComplete: false, isInProgress: false, isRollable: true });
    setDialogOpen(true);
  };

  const openEdit = (status: CustomStatus) => {
    setEditing(status);
    setForm({ name: status.name, color: status.color, isComplete: status.isComplete, isInProgress: status.isInProgress, isRollable: status.isRollable });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const isEditingDefault = editing && DEFAULT_STATUS_IDS.includes(editing.id);
    if (!isEditingDefault && !form.name.trim()) return;
    if (editing) {
      updateStatus({ ...editing, name: isEditingDefault ? editing.name : form.name.trim(), color: form.color, isComplete: form.isComplete, isInProgress: form.isInProgress, isRollable: form.isRollable });
    } else {
      addStatus({ name: form.name.trim(), color: form.color, isComplete: form.isComplete, isInProgress: form.isInProgress, isRollable: form.isRollable });
    }
    setDialogOpen(false);
  };

  const getUsageCount = (statusId: string) => {
    const tasks = data.tasks.filter((t) => t.statusId === statusId).length;
    const subtasks = data.tasks.flatMap((t) => t.subtasks).filter((s) => s.statusId === statusId).length;
    return tasks + subtasks;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Statuses</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />New Status
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Customize task statuses with colors and behavior. Statuses marked &quot;Complete&quot; exclude tasks from block generation and trigger repeating task resets. Statuses marked &quot;In Progress&quot; get priority in block generation.
      </p>

      {data.statuses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CircleDot className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No statuses. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.statuses.map((status) => {
            const count = getUsageCount(status.id);
            const isDefault = DEFAULT_STATUS_IDS.includes(status.id);
            return (
              <div key={status.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <span className="inline-block w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{status.name}</span>
                    {status.isComplete && <Badge variant="secondary" className="text-xs bg-green-900/30 text-green-400">Complete</Badge>}
                    {status.isInProgress && <Badge variant="secondary" className="text-xs bg-blue-900/30 text-blue-400">In Progress</Badge>}
                    {!status.isRollable && <Badge variant="secondary" className="text-xs bg-red-900/30 text-red-400">Not Rollable</Badge>}
                    {isDefault && <Badge variant="outline" className="text-xs text-muted-foreground">Default</Badge>}
                    <Badge variant="outline" className="text-xs">{count} {count === 1 ? "use" : "uses"}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(status)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    disabled={data.statuses.length <= 1}
                    onClick={() => setDeleteTarget(status)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Status" : "New Status"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {(!editing || !DEFAULT_STATUS_IDS.includes(editing.id)) && (
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. In Review, Waiting, On Hold..." onKeyDown={(e) => e.key === "Enter" && handleSave()} />
              </div>
            )}
            {editing && DEFAULT_STATUS_IDS.includes(editing.id) && (
              <p className="text-sm text-muted-foreground">Default statuses cannot be renamed — but you can change their color and rollable setting.</p>
            )}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({ ...form, color: val });
                  }}
                  placeholder="#rrggbb"
                  className="font-mono text-sm w-32"
                  maxLength={7}
                />
              </div>
            </div>
            {(!editing || !DEFAULT_STATUS_IDS.includes(editing.id)) && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="isComplete" checked={form.isComplete} onCheckedChange={(c) => setForm({ ...form, isComplete: c === true, isInProgress: c === true ? false : form.isInProgress })} />
                  <Label htmlFor="isComplete" className="text-sm font-normal cursor-pointer">Marks task as complete (triggers repeating reset)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="isInProgress" checked={form.isInProgress} onCheckedChange={(c) => setForm({ ...form, isInProgress: c === true, isComplete: c === true ? false : form.isComplete })} />
                  <Label htmlFor="isInProgress" className="text-sm font-normal cursor-pointer">Marks task as in-progress (prioritized in generation)</Label>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox id="isRollable" checked={form.isRollable} onCheckedChange={(c) => setForm({ ...form, isRollable: c === true })} />
              <Label htmlFor="isRollable" className="text-sm font-normal cursor-pointer">Rollable (tasks with this status can be picked during block generation)</Label>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: form.color }} />
              <span className="text-sm font-medium">{form.name || "Preview"}</span>
              {form.isComplete && <Badge variant="secondary" className="text-xs">Complete</Badge>}
              {form.isInProgress && <Badge variant="secondary" className="text-xs">In Progress</Badge>}
              {!form.isRollable && <Badge variant="secondary" className="text-xs bg-red-900/30 text-red-400">Not Rollable</Badge>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!editing && !form.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Status</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleteTarget?.name}&quot;? Tasks with this status will be reassigned to another status. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteStatus(deleteTarget.id); setDeleteTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
