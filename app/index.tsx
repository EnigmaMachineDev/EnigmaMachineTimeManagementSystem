import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAppContext } from "@/contexts/AppContext";
import type { TaskType } from "@/types";
import { getIcon, ICON_NAMES, ICON_MAP } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, LayoutGrid, ChevronUp, ChevronDown } from "lucide-react-native";

export default function TaskTypesPage() {
  const { data, addTaskType, updateTaskType, deleteTaskType, reorderTaskType } = useAppContext();
  const router = useRouter();

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
      addTaskType({
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
        subtypes: [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2), name: "General", priority: 0 }],
      });
    }
    setDialogOpen(false);
  };

  const getTaskCount = (typeId: string) => data.tasks.filter((t) => t.typeId === typeId).length;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-foreground">Task Types</Text>
        <Button size="sm" onPress={openAdd}>
          <View className="flex-row items-center gap-2">
            <Plus size={16} color="#c8e6c8" />
            <Text className="text-xs font-medium text-primary-foreground">New Type</Text>
          </View>
        </Button>
      </View>

      <Text className="text-sm text-muted-foreground">
        Create task types to organize your tasks. Tap a type to view and manage its tasks.
      </Text>

      {data.taskTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 items-center">
            <LayoutGrid size={32} color="#7a9f7a" style={{ opacity: 0.4 }} />
            <Text className="text-sm text-muted-foreground mt-3">No task types yet. Create one to get started.</Text>
          </CardContent>
        </Card>
      ) : (
        <View className="gap-4">
          {data.taskTypes.map((type) => {
            const Icon = getIcon(type.icon);
            const count = getTaskCount(type.id);
            const completedCount = data.tasks.filter((t) => {
              if (t.typeId !== type.id) return false;
              const status = data.statuses.find((s) => s.id === t.statusId);
              return status?.isComplete;
            }).length;

            return (
              <Card key={type.id}>
                <View className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: type.color }} />
                <CardContent className="pt-5 pb-4">
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-center gap-3">
                      <View
                        className="w-10 h-10 rounded-lg items-center justify-center"
                        style={{ backgroundColor: type.color + "20" }}
                      >
                        <Icon size={20} color={type.color} />
                      </View>
                      <View>
                        <Text className="font-semibold text-sm text-foreground">{type.name}</Text>
                        <Text className="text-xs text-muted-foreground">
                          {count} {count === 1 ? "task" : "tasks"}
                          {completedCount > 0 && ` · ${completedCount} done`}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row gap-1">
                      <Button variant="ghost" size="icon" onPress={() => reorderTaskType(type.id, "up")}>
                        <ChevronUp size={14} color="#7a9f7a" />
                      </Button>
                      <Button variant="ghost" size="icon" onPress={() => reorderTaskType(type.id, "down")}>
                        <ChevronDown size={14} color="#7a9f7a" />
                      </Button>
                      <Button variant="ghost" size="icon" onPress={() => openEdit(type)}>
                        <Pencil size={12} color="#7a9f7a" />
                      </Button>
                      <Button variant="ghost" size="icon" onPress={() => setDeleteTarget(type)}>
                        <Trash2 size={12} color="#e57373" />
                      </Button>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => router.push(`/tasks/${type.id}` as any)}
                    className="items-center rounded-md border border-border px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-muted-foreground">View Tasks →</Text>
                  </Pressable>
                </CardContent>
              </Card>
            );
          })}
        </View>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Task Type" : "New Task Type"}</DialogTitle>
          </DialogHeader>
          <View className="gap-4">
            <View>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                placeholder="e.g. Home Tasks, Work, Hobbies..."
              />
            </View>
            <View>
              <Label>Icon</Label>
              <View className="flex-row flex-wrap gap-2 mt-2">
                {ICON_NAMES.map((name) => {
                  const Ic = ICON_MAP[name];
                  return (
                    <Pressable
                      key={name}
                      onPress={() => setForm({ ...form, icon: name })}
                      className={`w-8 h-8 rounded items-center justify-center ${form.icon === name ? "bg-primary" : ""}`}
                    >
                      <Ic size={16} color={form.icon === name ? "#c8e6c8" : "#7a9f7a"} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View>
              <Label>Color</Label>
              <ColorSwatchPicker value={form.color} onValueChange={(c) => setForm({ ...form, color: c })} />
              <View className="flex-row items-center gap-2 mt-3">
                {(() => { const Ic = getIcon(form.icon); return <Ic size={20} color={form.color} />; })()}
                <Text className="text-sm font-medium text-foreground">{form.name || "Preview"}</Text>
              </View>
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setDialogOpen(false)}>
              <Text className="text-sm text-foreground">Cancel</Text>
            </Button>
            <Button onPress={handleSave} disabled={!form.name.trim()}>
              <Text className="text-sm text-primary-foreground">Save</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task Type</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.name}"? All tasks of this type will also be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onPress={() => { if (deleteTarget) { deleteTaskType(deleteTarget.id); setDeleteTarget(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollView>
  );
}
