"use client";

import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { HomeTask, HomeTaskCategory, RepeatingType, TaskStatus } from "@/types";
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
  RotateCcw,
  AlertCircle,
  Clock,
  CalendarDays,
  Star,
  List,
  Briefcase,
  CheckSquare,
} from "lucide-react";

const REPEATING_ORDER: RepeatingType[] = ["weekly", "bimonthly", "monthly", "quarterly", "yearly"];
const CATEGORY_LABELS: Record<HomeTaskCategory, string> = {
  scheduled: "Scheduled Tasks",
  priority: "Priority Tasks",
  repeating: "Repeating Tasks",
  freelance: "Freelance Work",
  misc: "Misc Tasks",
};
const CATEGORY_ICONS: Record<HomeTaskCategory, React.ReactNode> = {
  scheduled: <CalendarDays className="h-4 w-4" />,
  priority: <Star className="h-4 w-4" />,
  repeating: <RotateCcw className="h-4 w-4" />,
  freelance: <Briefcase className="h-4 w-4" />,
  misc: <List className="h-4 w-4" />,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  incomplete: "bg-secondary text-secondary-foreground",
  "in-progress": "bg-blue-900/50 text-blue-300",
  blocked: "bg-red-900/50 text-red-300",
  complete: "bg-green-900/50 text-green-300",
};

type FormData = {
  name: string;
  description: string;
  category: HomeTaskCategory;
  repeatingType: RepeatingType;
  scheduledDate: string;
  status: TaskStatus;
  blockedReason: string;
};

const emptyForm: FormData = {
  name: "",
  description: "",
  category: "misc",
  repeatingType: "weekly",
  scheduledDate: "",
  status: "incomplete",
  blockedReason: "",
};

export default function HomeTasksPage() {
  const { data, addHomeTask, updateHomeTask, deleteHomeTask, resetRepeating, clearCompletedHomeTasks } = useAppContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<HomeTask | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<HomeTask | null>(null);
  const [blockedDialogTask, setBlockedDialogTask] = useState<HomeTask | null>(null);
  const [blockedReason, setBlockedReason] = useState("");

  const openAdd = () => {
    setEditingTask(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (task: HomeTask) => {
    setEditingTask(task);
    setForm({
      name: task.name,
      description: task.description,
      category: task.category,
      repeatingType: task.repeatingType || "weekly",
      scheduledDate: task.scheduledDate || "",
      status: task.status,
      blockedReason: task.blockedReason || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const taskData = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      repeatingType: form.category === "repeating" ? form.repeatingType : undefined,
      scheduledDate: form.category === "scheduled" ? form.scheduledDate : undefined,
      status: form.status,
      blockedReason: form.status === "blocked" ? form.blockedReason : undefined,
    };
    if (editingTask) {
      updateHomeTask({ ...taskData, id: editingTask.id });
    } else {
      addHomeTask(taskData);
    }
    setDialogOpen(false);
  };

  const handleStatusChange = (task: HomeTask, status: TaskStatus) => {
    if (status === "blocked") {
      setBlockedDialogTask(task);
      setBlockedReason(task.blockedReason || "");
      return;
    }
    updateHomeTask({ ...task, status, blockedReason: undefined });
  };

  const confirmBlocked = () => {
    if (blockedDialogTask && blockedReason.trim()) {
      updateHomeTask({ ...blockedDialogTask, status: "blocked", blockedReason: blockedReason.trim() });
      setBlockedDialogTask(null);
      setBlockedReason("");
    }
  };

  const tasksByCategory = (category: HomeTaskCategory) =>
    data.homeTasks.filter((t) => t.category === category);

  const repeatingByType = (type: RepeatingType) =>
    data.homeTasks.filter((t) => t.category === "repeating" && t.repeatingType === type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Home Tasks</h1>
        <div className="flex gap-2">
          {data.homeTasks.some((t) => t.status === "complete") && (
            <Button variant="outline" onClick={clearCompletedHomeTasks}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Clear Completed
            </Button>
          )}
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Reset Buttons */}
      <div className="flex flex-wrap gap-2">
        {REPEATING_ORDER.map((type) => (
          <Button key={type} variant="outline" size="sm" onClick={() => resetRepeating(type)}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        ))}
      </div>

      {/* Scheduled Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {CATEGORY_ICONS.scheduled}
            {CATEGORY_LABELS.scheduled}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksByCategory("scheduled").length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No scheduled tasks</p>
          ) : (
            <div className="space-y-2">
              {tasksByCategory("scheduled").map((task) => (
                <TaskRow key={task.id} task={task} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {CATEGORY_ICONS.priority}
            {CATEGORY_LABELS.priority}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksByCategory("priority").length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No priority tasks</p>
          ) : (
            <div className="space-y-2">
              {tasksByCategory("priority").map((task) => (
                <TaskRow key={task.id} task={task} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repeating Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {CATEGORY_ICONS.repeating}
            {CATEGORY_LABELS.repeating}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {REPEATING_ORDER.map((type) => {
            const tasks = repeatingByType(type);
            return (
              <div key={type}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </h3>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No {type} tasks</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <TaskRow key={task.id} task={task} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Freelance Work Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {CATEGORY_ICONS.freelance}
            {CATEGORY_LABELS.freelance}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksByCategory("freelance").length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No freelance tasks</p>
          ) : (
            <div className="space-y-2">
              {tasksByCategory("freelance").map((task) => (
                <TaskRow key={task.id} task={task} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Misc Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {CATEGORY_ICONS.misc}
            {CATEGORY_LABELS.misc}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasksByCategory("misc").length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No misc tasks</p>
          ) : (
            <div className="space-y-2">
              {tasksByCategory("misc").map((task) => (
                <TaskRow key={task.id} task={task} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Home Task"}</DialogTitle>
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
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as HomeTaskCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="repeating">Repeating</SelectItem>
                  <SelectItem value="freelance">Freelance Work</SelectItem>
                  <SelectItem value="misc">Misc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.category === "repeating" && (
              <div>
                <Label>Repeating Type</Label>
                <Select value={form.repeatingType} onValueChange={(v) => setForm({ ...form, repeatingType: v as RepeatingType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bimonthly">Bimonthly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.category === "scheduled" && (
              <div>
                <Label>Scheduled Date</Label>
                <Input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status === "blocked" && (
              <div>
                <Label>Blocked Reason</Label>
                <Textarea value={form.blockedReason} onChange={(e) => setForm({ ...form, blockedReason: e.target.value })} />
              </div>
            )}
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
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteHomeTask(deleteTarget.id); setDeleteTarget(null); } }}>
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

function TaskRow({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: HomeTask;
  onEdit: (t: HomeTask) => void;
  onDelete: (t: HomeTask) => void;
  onStatusChange: (t: HomeTask, s: TaskStatus) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${task.status === "complete" ? "line-through text-muted-foreground" : ""}`}>{task.name}</span>
          <Badge variant="secondary" className={STATUS_COLORS[task.status]}>
            {task.status}
          </Badge>
          {task.category === "scheduled" && task.scheduledDate && (
            <Badge variant="outline" className="text-xs">
              <CalendarDays className="h-3 w-3 mr-1" />
              {task.scheduledDate}
            </Badge>
          )}
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
        <Select
          value={task.status}
          onValueChange={(v) => onStatusChange(task, v as TaskStatus)}
        >
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(task)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(task)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
