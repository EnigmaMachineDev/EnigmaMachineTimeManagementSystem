"use client";

import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { FreeTimeTask, FreeTimeCategory, TaskStatus } from "@/types";
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
  Gamepad2,
  Settings,
  AlertCircle,
  Shuffle,
  CheckSquare,
} from "lucide-react";

const STATUS_COLORS: Record<TaskStatus, string> = {
  incomplete: "bg-secondary text-secondary-foreground",
  "in-progress": "bg-blue-900/50 text-blue-300",
  blocked: "bg-red-900/50 text-red-300",
  complete: "bg-green-900/50 text-green-300",
};

type TaskFormData = {
  name: string;
  description: string;
  categoryId: string;
  section: "active" | "backlog";
  status: TaskStatus;
  blockedReason: string;
};

export default function FreeTimeTasksPage() {
  const {
    data,
    addFreeTimeCategory,
    deleteFreeTimeCategory,
    updateFreeTimeCategory,
    addFreeTimeTask,
    updateFreeTimeTask,
    deleteFreeTimeTask,
    moveFreeTimeTask,
    clearCompletedFreeTimeTasks,
  } = useAppContext();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FreeTimeTask | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormData>({ name: "", description: "", categoryId: "", section: "backlog", status: "incomplete", blockedReason: "" });
  const [deleteTarget, setDeleteTarget] = useState<FreeTimeTask | null>(null);
  const [blockedDialogTask, setBlockedDialogTask] = useState<FreeTimeTask | null>(null);
  const [blockedReason, setBlockedReason] = useState("");

  // Category management
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "" });
  const [editingCat, setEditingCat] = useState<FreeTimeCategory | null>(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState<FreeTimeCategory | null>(null);
  const [manageCatsOpen, setManageCatsOpen] = useState(false);

  const categories = data.freeTimeCategories;

  const tasksForCategory = (catId: string, section: "active" | "backlog") =>
    data.freeTimeTasks.filter((t) => t.categoryId === catId && t.section === section);

  const activeCountForCategory = (catId: string) =>
    data.freeTimeTasks.filter((t) => t.categoryId === catId && t.section === "active").length;

  const randomActivateFromBacklog = (catId: string) => {
    const backlog = data.freeTimeTasks.filter((t) => t.categoryId === catId && t.section === "backlog");
    if (backlog.length === 0 || activeCountForCategory(catId) >= 2) return;
    const pick = backlog[Math.floor(Math.random() * backlog.length)];
    moveFreeTimeTask(pick.id, "active");
  };

  // Task CRUD
  const openAddTask = () => {
    setEditingTask(null);
    setTaskForm({ name: "", description: "", categoryId: categories[0]?.id || "", section: "backlog", status: "incomplete", blockedReason: "" });
    setTaskDialogOpen(true);
  };

  const openEditTask = (task: FreeTimeTask) => {
    setEditingTask(task);
    setTaskForm({ name: task.name, description: task.description, categoryId: task.categoryId, section: task.section, status: task.status ?? "incomplete", blockedReason: task.blockedReason || "" });
    setTaskDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!taskForm.name.trim() || !taskForm.categoryId) return;
    if (taskForm.section === "active" && activeCountForCategory(taskForm.categoryId) >= 2) {
      if (!editingTask || editingTask.categoryId !== taskForm.categoryId || editingTask.section !== "active") {
        alert("Maximum 2 active tasks per category. Add to backlog instead.");
        return;
      }
    }
    const taskData = {
      name: taskForm.name.trim(),
      description: taskForm.description.trim(),
      categoryId: taskForm.categoryId,
      section: taskForm.section,
      status: taskForm.status,
      blockedReason: taskForm.status === "blocked" ? taskForm.blockedReason : undefined,
    };
    if (editingTask) {
      updateFreeTimeTask({ ...editingTask, ...taskData });
    } else {
      addFreeTimeTask(taskData);
    }
    setTaskDialogOpen(false);
  };

  const handleStatusChange = (task: FreeTimeTask, status: TaskStatus) => {
    if (status === "blocked") {
      setBlockedDialogTask(task);
      setBlockedReason(task.blockedReason || "");
      return;
    }
    updateFreeTimeTask({ ...task, status, blockedReason: undefined });
  };

  const confirmBlocked = () => {
    if (blockedDialogTask && blockedReason.trim()) {
      updateFreeTimeTask({ ...blockedDialogTask, status: "blocked", blockedReason: blockedReason.trim() });
      setBlockedDialogTask(null);
      setBlockedReason("");
    }
  };

  // Category CRUD
  const openAddCat = () => {
    setEditingCat(null);
    setCatForm({ name: "" });
    setCatDialogOpen(true);
  };

  const openEditCat = (cat: FreeTimeCategory) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name });
    setCatDialogOpen(true);
  };

  const handleSaveCat = () => {
    if (!catForm.name.trim()) return;
    if (editingCat) {
      updateFreeTimeCategory(editingCat.id, catForm.name.trim());
    } else {
      addFreeTimeCategory(catForm.name.trim());
    }
    setCatDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Free Time Tasks</h1>
        <div className="flex gap-2">
          {data.freeTimeTasks.some((t) => (t.status ?? "incomplete") === "complete") && (
            <Button variant="outline" onClick={clearCompletedFreeTimeTasks}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Clear Completed
            </Button>
          )}
          <Button variant="outline" onClick={() => setManageCatsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Categories
          </Button>
          <Button onClick={openAddTask} disabled={categories.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No categories yet. Add a category to get started.
          </CardContent>
        </Card>
      )}

      {/* Active Section */}
      {categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gamepad2 className="h-4 w-4" />
              Active Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((cat) => {
              const tasks = tasksForCategory(cat.id, "active");
              return (
                <div key={cat.id}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {cat.name}
                    <Badge variant="outline" className="ml-2 text-xs">{tasks.length}/2</Badge>
                  </h3>
                  {tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No active tasks</p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <FreeTimeTaskRow
                          key={task.id}
                          task={task}
                          onEdit={() => openEditTask(task)}
                          onDelete={() => setDeleteTarget(task)}
                          onMove={() => moveFreeTimeTask(task.id, "backlog")}
                          moveLabel="To Backlog"
                          moveIcon={<ArrowDown className="h-3.5 w-3.5" />}
                          canMove={true}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Backlog Section */}
      {categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gamepad2 className="h-4 w-4" />
              Backlog
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((cat) => {
              const tasks = tasksForCategory(cat.id, "backlog");
              const canActivate = activeCountForCategory(cat.id) < 2;
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {cat.name}
                      <Badge variant="outline" className="ml-2 text-xs">{tasks.length}</Badge>
                    </h3>
                    {tasks.length > 0 && canActivate && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => randomActivateFromBacklog(cat.id)}>
                        <Shuffle className="h-3 w-3 mr-1" />
                        Random to Active
                      </Button>
                    )}
                  </div>
                  {tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No backlog tasks</p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <FreeTimeTaskRow
                          key={task.id}
                          task={task}
                          onEdit={() => openEditTask(task)}
                          onDelete={() => setDeleteTarget(task)}
                          onMove={() => moveFreeTimeTask(task.id, "active")}
                          moveLabel="To Active"
                          moveIcon={<ArrowUp className="h-3.5 w-3.5" />}
                          canMove={canActivate}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Free Time Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={taskForm.categoryId || undefined} onValueChange={(v) => setTaskForm({ ...taskForm, categoryId: v ?? ""})}>
                <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section</Label>
              <Select value={taskForm.section} onValueChange={(v) => setTaskForm({ ...taskForm, section: v as "active" | "backlog" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={taskForm.status} onValueChange={(v) => setTaskForm({ ...taskForm, status: v as TaskStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {taskForm.status === "blocked" && (
              <div>
                <Label>Blocked Reason</Label>
                <Textarea value={taskForm.blockedReason} onChange={(e) => setTaskForm({ ...taskForm, blockedReason: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTask} disabled={!taskForm.name.trim() || !taskForm.categoryId}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={manageCatsOpen} onOpenChange={setManageCatsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No categories</p>
            ) : (
              categories.map((cat) => {
                const taskCount = data.freeTimeTasks.filter((t) => t.categoryId === cat.id).length;
                return (
                  <div key={cat.id} className="flex items-center gap-2 rounded border border-border p-2">
                    <span className="flex-1 text-sm font-medium">{cat.name}</span>
                    <Badge variant="outline" className="text-xs">{taskCount} tasks</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCat(cat)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteCatTarget(cat)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={openAddCat}>
              <Plus className="h-3 w-3 mr-1" />
              Add Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Add/Edit Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Name</Label>
            <Input value={catForm.name} onChange={(e) => setCatForm({ name: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCat} disabled={!catForm.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteFreeTimeTask(deleteTarget.id); setDeleteTarget(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCatTarget} onOpenChange={(open) => !open && setDeleteCatTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteCatTarget?.name}&quot;? All tasks in this category will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteCatTarget) { deleteFreeTimeCategory(deleteCatTarget.id); setDeleteCatTarget(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Blocked Reason Dialog */}
      <Dialog open={!!blockedDialogTask} onOpenChange={(open) => !open && setBlockedDialogTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blocked Reason</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Why is this task blocked?</Label>
            <Textarea value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockedDialogTask(null)}>Cancel</Button>
            <Button onClick={confirmBlocked} disabled={!blockedReason.trim()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FreeTimeTaskRow({
  task,
  onEdit,
  onDelete,
  onMove,
  moveLabel,
  moveIcon,
  canMove,
  onStatusChange,
}: {
  task: FreeTimeTask;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
  moveLabel: string;
  moveIcon: React.ReactNode;
  canMove: boolean;
  onStatusChange: (task: FreeTimeTask, status: TaskStatus) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${(task.status ?? "incomplete") === "complete" ? "line-through text-muted-foreground" : ""}`}>{task.name}</span>
          <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[task.status ?? "incomplete"]}`}>
            {task.status ?? "incomplete"}
          </Badge>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
        )}
        {task.status === "blocked" && task.blockedReason && (
          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {task.blockedReason}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Select value={task.status ?? "incomplete"} onValueChange={(v) => onStatusChange(task, v as TaskStatus)}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="incomplete">Incomplete</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
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
  );
}
