import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useAppContext } from "@/contexts/AppContext";
import type { Flag } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/Dialog";
import { Plus, Pencil, Trash2, Flag as FlagIcon } from "lucide-react-native";

export default function FlagsPage() {
  const { data, addFlag, updateFlag, deleteFlag, updateTask, updateSubtask } = useAppContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Flag | null>(null);
  const [form, setForm] = useState({ name: "", color: "#3b82f6" });
  const [deleteTarget, setDeleteTarget] = useState<Flag | null>(null);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);

  const openAdd = () => { setEditing(null); setForm({ name: "", color: "#3b82f6" }); setDialogOpen(true); };
  const openEdit = (f: Flag) => { setEditing(f); setForm({ name: f.name, color: f.color }); setDialogOpen(true); };
  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) updateFlag({ ...editing, name: form.name.trim(), color: form.color });
    else addFlag({ name: form.name.trim(), color: form.color });
    setDialogOpen(false);
  };

  const toggleFlagOnTask = (taskId: string, flagId: string) => {
    const task = data.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const has = (task.flagIds ?? []).includes(flagId);
    updateTask({ ...task, flagIds: has ? (task.flagIds ?? []).filter((id) => id !== flagId) : [...(task.flagIds ?? []), flagId] });
  };

  const toggleFlagOnSubtask = (taskId: string, subtaskId: string, flagId: string) => {
    const task = data.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtask = task.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;
    const has = (subtask.flagIds ?? []).includes(flagId);
    updateSubtask(taskId, { ...subtask, flagIds: has ? (subtask.flagIds ?? []).filter((id) => id !== flagId) : [...(subtask.flagIds ?? []), flagId] });
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-foreground">Flags</Text>
        <Button size="sm" onPress={openAdd}>
          <View className="flex-row items-center gap-2">
            <Plus size={16} color="#c8e6c8" />
            <Text className="text-xs font-medium text-primary-foreground">New Flag</Text>
          </View>
        </Button>
      </View>
      <Text className="text-sm text-muted-foreground">
        Flags can be assigned to tasks and subtasks. They are also used as filters in block generation.
      </Text>

      {data.flags.length === 0 ? (
        <Card>
          <CardContent className="py-12 items-center">
            <FlagIcon size={32} color="#7a9f7a" style={{ opacity: 0.4 }} />
            <Text className="text-sm text-muted-foreground mt-3">No flags yet. Create one to get started.</Text>
          </CardContent>
        </Card>
      ) : (
        <View className="gap-3">
          {data.flags.map((flag) => {
            const expanded = expandedFlag === flag.id;
            return (
              <Card key={flag.id}>
                <CardContent className="pt-4 pb-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-4 h-4 rounded-full" style={{ backgroundColor: flag.color }} />
                    <Text className="font-semibold text-sm text-foreground flex-1">{flag.name}</Text>
                    <View className="flex-row gap-1">
                      <Button variant="ghost" size="icon" onPress={() => setExpandedFlag(expanded ? null : flag.id)}>
                        <FlagIcon size={14} color={flag.color} />
                      </Button>
                      <Button variant="ghost" size="icon" onPress={() => openEdit(flag)}>
                        <Pencil size={14} color="#7a9f7a" />
                      </Button>
                      <Button variant="ghost" size="icon" onPress={() => setDeleteTarget(flag)}>
                        <Trash2 size={14} color="#e57373" />
                      </Button>
                    </View>
                  </View>
                  {expanded && (
                    <View className="mt-3 border-t border-border pt-3 gap-2">
                      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Assign to Tasks</Text>
                      {data.tasks.length === 0 ? (
                        <Text className="text-xs text-muted-foreground italic">No tasks available</Text>
                      ) : (
                        data.taskTypes.map((type) => {
                          const typeTasks = data.tasks.filter((t) => t.typeId === type.id);
                          if (typeTasks.length === 0) return null;
                          return (
                            <View key={type.id} className="gap-1">
                              <Text className="text-xs font-medium" style={{ color: type.color }}>{type.name}</Text>
                              {typeTasks.map((task) => {
                                const hasFlag = (task.flagIds ?? []).includes(flag.id);
                                return (
                                  <View key={task.id} className="ml-3 gap-1">
                                    <Pressable onPress={() => toggleFlagOnTask(task.id, flag.id)} className="flex-row items-center gap-2 py-1">
                                      <View className={`w-3.5 h-3.5 rounded border ${hasFlag ? "border-transparent" : "border-border"}`} style={hasFlag ? { backgroundColor: flag.color } : {}} />
                                      <Text className="text-xs text-foreground">{task.name}</Text>
                                    </Pressable>
                                    {task.subtasks.map((sub) => {
                                      const subHasFlag = (sub.flagIds ?? []).includes(flag.id);
                                      return (
                                        <Pressable key={sub.id} onPress={() => toggleFlagOnSubtask(task.id, sub.id, flag.id)} className="flex-row items-center gap-2 py-1 ml-4">
                                          <View className={`w-3 h-3 rounded border ${subHasFlag ? "border-transparent" : "border-border"}`} style={subHasFlag ? { backgroundColor: flag.color } : {}} />
                                          <Text className="text-xs text-muted-foreground">{sub.name}</Text>
                                        </Pressable>
                                      );
                                    })}
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </View>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Flag" : "New Flag"}</DialogTitle></DialogHeader>
          <View className="gap-4">
            <View><Label>Name</Label><Input value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="e.g. Urgent, Low Priority..." /></View>
            <View><Label>Color</Label><ColorSwatchPicker value={form.color} onValueChange={(c) => setForm({ ...form, color: c })} /></View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setDialogOpen(false)}><Text className="text-sm text-foreground">Cancel</Text></Button>
            <Button onPress={handleSave} disabled={!form.name.trim()}><Text className="text-sm text-primary-foreground">Save</Text></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Flag</AlertDialogTitle><AlertDialogDescription>Delete "{deleteTarget?.name}"? It will be removed from all tasks.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onPress={() => { if (deleteTarget) { deleteFlag(deleteTarget.id); setDeleteTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollView>
  );
}
