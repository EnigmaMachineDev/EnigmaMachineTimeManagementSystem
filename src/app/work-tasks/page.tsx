"use client";

import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { WorkItem, Subtask, SubtaskStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Briefcase,
  AlertCircle,
  CheckSquare,
  Shuffle,
} from "lucide-react";

const SUBTASK_STATUS_COLORS: Record<SubtaskStatus, string> = {
  incomplete: "bg-secondary text-secondary-foreground",
  "in-progress": "bg-blue-900/50 text-blue-300",
  blocked: "bg-red-900/50 text-red-300",
  complete: "bg-green-900/50 text-green-300",
};

export default function WorkTasksPage() {
  const {
    data,
    addWorkItem,
    updateWorkItem,
    deleteWorkItem,
    moveWorkItem,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    clearCompletedWorkItems,
  } = useAppContext();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "", section: "backlog" as "active" | "backlog" });
  const [deleteTarget, setDeleteTarget] = useState<WorkItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Subtask dialog
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [subtaskParentId, setSubtaskParentId] = useState<string>("");
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [subtaskForm, setSubtaskForm] = useState({ name: "", status: "incomplete" as SubtaskStatus, blockedReason: "" });
  const [subtaskBlockedDialog, setSubtaskBlockedDialog] = useState<{ workItemId: string; subtask: Subtask } | null>(null);
  const [subtaskBlockedReason, setSubtaskBlockedReason] = useState("");
  const [deleteSubtaskTarget, setDeleteSubtaskTarget] = useState<{ workItemId: string; subtask: Subtask } | null>(null);

  const activeItems = data.workItems.filter((w) => w.section === "active");
  const backlogItems = data.workItems.filter((w) => w.section === "backlog");
  const activeCount = activeItems.length;

  const randomActivateFromBacklog = () => {
    if (backlogItems.length === 0 || activeCount >= 5) return;
    const pick = backlogItems[Math.floor(Math.random() * backlogItems.length)];
    moveWorkItem(pick.id, "active");
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddItem = () => {
    setEditingItem(null);
    setForm({ name: "", description: "", section: "backlog" });
    setDialogOpen(true);
  };

  const openEditItem = (item: WorkItem) => {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description, section: item.section });
    setDialogOpen(true);
  };

  const handleSaveItem = () => {
    if (!form.name.trim()) return;
    if (editingItem) {
      updateWorkItem({ ...editingItem, name: form.name.trim(), description: form.description.trim(), section: form.section });
    } else {
      if (form.section === "active" && activeCount >= 5) {
        alert("Maximum 5 active work items allowed. Add to backlog instead.");
        return;
      }
      addWorkItem({ name: form.name.trim(), description: form.description.trim(), section: form.section });
    }
    setDialogOpen(false);
  };

  const openAddSubtask = (workItemId: string) => {
    setSubtaskParentId(workItemId);
    setEditingSubtask(null);
    setSubtaskForm({ name: "", status: "incomplete", blockedReason: "" });
    setSubtaskDialogOpen(true);
  };

  const openEditSubtask = (workItemId: string, subtask: Subtask) => {
    setSubtaskParentId(workItemId);
    setEditingSubtask(subtask);
    setSubtaskForm({ name: subtask.name, status: subtask.status, blockedReason: subtask.blockedReason || "" });
    setSubtaskDialogOpen(true);
  };

  const handleSubtaskStatusChange = (workItemId: string, subtask: Subtask, status: SubtaskStatus) => {
    if (status === "blocked") {
      setSubtaskBlockedDialog({ workItemId, subtask });
      setSubtaskBlockedReason(subtask.blockedReason || "");
      return;
    }
    updateSubtask(workItemId, { ...subtask, status, blockedReason: undefined });
  };

  const confirmSubtaskBlocked = () => {
    if (subtaskBlockedDialog && subtaskBlockedReason.trim()) {
      updateSubtask(subtaskBlockedDialog.workItemId, { ...subtaskBlockedDialog.subtask, status: "blocked", blockedReason: subtaskBlockedReason.trim() });
      setSubtaskBlockedDialog(null);
      setSubtaskBlockedReason("");
    }
  };

  const handleSaveSubtask = () => {
    if (!subtaskForm.name.trim()) return;
    if (editingSubtask) {
      updateSubtask(subtaskParentId, { ...editingSubtask, name: subtaskForm.name.trim(), status: subtaskForm.status, blockedReason: subtaskForm.status === "blocked" ? subtaskForm.blockedReason : undefined });
    } else {
      addSubtask(subtaskParentId, { name: subtaskForm.name.trim(), status: subtaskForm.status, blockedReason: subtaskForm.status === "blocked" ? subtaskForm.blockedReason : undefined });
    }
    setSubtaskDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Work Tasks</h1>
        <div className="flex gap-2">
          {data.workItems.some((w) => w.subtasks.some((s) => s.status === "complete")) && (
            <Button variant="outline" onClick={clearCompletedWorkItems}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Clear Completed
            </Button>
          )}
          <Button onClick={openAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Work Item
          </Button>
        </div>
      </div>

      {/* Active Work Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-4 w-4" />
            Active Work Items
            <Badge variant="outline" className="ml-2">{activeCount}/5</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeItems.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No active work items</p>
          ) : (
            <div className="space-y-3">
              {activeItems.map((item) => (
                <WorkItemCard
                  key={item.id}
                  item={item}
                  expanded={expandedItems.has(item.id)}
                  onToggleExpand={() => toggleExpanded(item.id)}
                  onEdit={() => openEditItem(item)}
                  onDelete={() => setDeleteTarget(item)}
                  onMove={() => moveWorkItem(item.id, "backlog")}
                  moveLabel="Move to Backlog"
                  moveIcon={<ArrowDown className="h-3.5 w-3.5" />}
                  canMove={true}
                  onAddSubtask={() => openAddSubtask(item.id)}
                  onEditSubtask={(s) => openEditSubtask(item.id, s)}
                  onDeleteSubtask={(s) => setDeleteSubtaskTarget({ workItemId: item.id, subtask: s })}
                  onSubtaskStatusChange={(s, status) => handleSubtaskStatusChange(item.id, s, status)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backlog */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Backlog
              <Badge variant="outline" className="ml-2">{backlogItems.length}</Badge>
            </div>
            {backlogItems.length > 0 && activeCount < 5 && (
              <Button variant="outline" size="sm" className="h-7 text-xs font-normal" onClick={randomActivateFromBacklog}>
                <Shuffle className="h-3 w-3 mr-1" />
                Random to Active
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backlogItems.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No backlog items</p>
          ) : (
            <div className="space-y-3">
              {backlogItems.map((item) => (
                <WorkItemCard
                  key={item.id}
                  item={item}
                  expanded={expandedItems.has(item.id)}
                  onToggleExpand={() => toggleExpanded(item.id)}
                  onEdit={() => openEditItem(item)}
                  onDelete={() => setDeleteTarget(item)}
                  onMove={() => moveWorkItem(item.id, "active")}
                  moveLabel="Move to Active"
                  moveIcon={<ArrowUp className="h-3.5 w-3.5" />}
                  canMove={activeCount < 5}
                  onAddSubtask={() => openAddSubtask(item.id)}
                  onEditSubtask={(s) => openEditSubtask(item.id, s)}
                  onDeleteSubtask={(s) => setDeleteSubtaskTarget({ workItemId: item.id, subtask: s })}
                  onSubtaskStatusChange={(s, status) => handleSubtaskStatusChange(item.id, s, status)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Work Item" : "Add Work Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Section</Label>
              <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v as "active" | "backlog" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" disabled={!editingItem && activeCount >= 5}>Active ({activeCount}/5)</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={!form.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subtask Dialog */}
      <Dialog open={subtaskDialogOpen} onOpenChange={setSubtaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubtask ? "Edit Subtask" : "Add Subtask"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={subtaskForm.name} onChange={(e) => setSubtaskForm({ ...subtaskForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={subtaskForm.status} onValueChange={(v) => setSubtaskForm({ ...subtaskForm, status: v as SubtaskStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {subtaskForm.status === "blocked" && (
              <div>
                <Label>Blocked Reason</Label>
                <Textarea value={subtaskForm.blockedReason} onChange={(e) => setSubtaskForm({ ...subtaskForm, blockedReason: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubtaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubtask} disabled={!subtaskForm.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Work Item Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot; and all its subtasks? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteWorkItem(deleteTarget.id); setDeleteTarget(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subtask Confirmation */}
      <AlertDialog open={!!deleteSubtaskTarget} onOpenChange={(open) => !open && setDeleteSubtaskTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subtask</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteSubtaskTarget?.subtask.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteSubtaskTarget) {
                deleteSubtask(deleteSubtaskTarget.workItemId, deleteSubtaskTarget.subtask.id);
                setDeleteSubtaskTarget(null);
              }
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subtask Blocked Reason Dialog */}
      <Dialog open={!!subtaskBlockedDialog} onOpenChange={(open) => !open && setSubtaskBlockedDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blocked Reason</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Why is this subtask blocked?</Label>
            <Textarea value={subtaskBlockedReason} onChange={(e) => setSubtaskBlockedReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubtaskBlockedDialog(null)}>Cancel</Button>
            <Button onClick={confirmSubtaskBlocked} disabled={!subtaskBlockedReason.trim()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkItemCard({
  item,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onMove,
  moveLabel,
  moveIcon,
  canMove,
  onAddSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onSubtaskStatusChange,
}: {
  item: WorkItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
  moveLabel: string;
  moveIcon: React.ReactNode;
  canMove: boolean;
  onAddSubtask: () => void;
  onEditSubtask: (s: Subtask) => void;
  onDeleteSubtask: (s: Subtask) => void;
  onSubtaskStatusChange: (s: Subtask, status: SubtaskStatus) => void;
}) {
  const completedCount = item.subtasks.filter((s) => s.status === "complete").length;
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 p-3">
        <button onClick={onToggleExpand} className="flex-shrink-0 text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{item.name}</span>
            <Badge variant="outline" className="text-xs">
              {completedCount}/{item.subtasks.length} subtasks
            </Badge>
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{item.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onMove} disabled={!canMove}>
            {moveIcon}
            <span className="ml-1 hidden sm:inline">{moveLabel}</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border p-3 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subtasks</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAddSubtask}>
              <Plus className="h-3 w-3 mr-1" />
              Add Subtask
            </Button>
          </div>
          {item.subtasks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No subtasks yet</p>
          ) : (
            <div className="space-y-1.5">
              {item.subtasks.map((subtask) => (
                <div key={subtask.id} className="rounded border border-border bg-card p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${subtask.status === "complete" ? "line-through text-muted-foreground" : ""}`}>{subtask.name}</span>
                      {subtask.status === "blocked" && subtask.blockedReason && (
                        <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {subtask.blockedReason}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className={`text-xs ${SUBTASK_STATUS_COLORS[subtask.status]}`}>
                      {subtask.status}
                    </Badge>
                    <Select
                      value={subtask.status}
                      onValueChange={(v) => onSubtaskStatusChange(subtask, v as SubtaskStatus)}
                    >
                      <SelectTrigger className="h-7 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incomplete">Incomplete</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditSubtask(subtask)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteSubtask(subtask)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
