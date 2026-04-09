import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useAppContext } from "@/contexts/AppContext";
import type { CustomStatus } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/Dialog";
import { Plus, Pencil, Trash2, CircleDot } from "lucide-react-native";

type StatusForm = { name: string; color: string; isComplete: boolean; isInProgress: boolean; isRollable: boolean };

export default function StatusesPage() {
  const { data, addStatus, updateStatus, deleteStatus } = useAppContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomStatus | null>(null);
  const blankForm = (): StatusForm => ({ name: "", color: "#64748b", isComplete: false, isInProgress: false, isRollable: true });
  const [form, setForm] = useState<StatusForm>(blankForm);
  const [deleteTarget, setDeleteTarget] = useState<CustomStatus | null>(null);

  const openAdd = () => { setEditing(null); setForm(blankForm()); setDialogOpen(true); };
  const openEdit = (s: CustomStatus) => { setEditing(s); setForm({ name: s.name, color: s.color, isComplete: s.isComplete, isInProgress: s.isInProgress, isRollable: s.isRollable }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) updateStatus({ ...editing, ...form, name: form.name.trim() });
    else addStatus({ ...form, name: form.name.trim() });
    setDialogOpen(false);
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-foreground">Statuses</Text>
        <Button size="sm" onPress={openAdd}>
          <View className="flex-row items-center gap-2">
            <Plus size={16} color="#c8e6c8" />
            <Text className="text-xs font-medium text-primary-foreground">New Status</Text>
          </View>
        </Button>
      </View>
      <Text className="text-sm text-muted-foreground">
        Create custom statuses for tasks and subtasks. Toggle properties to control behavior.
      </Text>

      <View className="gap-3">
        {data.statuses.map((status) => (
          <Card key={status.id}>
            <CardContent className="pt-4 pb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-5 h-5 rounded-full" style={{ backgroundColor: status.color }} />
                <View className="flex-1">
                  <Text className="font-semibold text-sm text-foreground">{status.name}</Text>
                  <View className="flex-row gap-2 mt-1 flex-wrap">
                    {status.isComplete && <Text className="text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">Complete</Text>}
                    {status.isInProgress && <Text className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">In Progress</Text>}
                    {status.isRollable && <Text className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">Rollable</Text>}
                    {!status.isComplete && !status.isInProgress && !status.isRollable && (
                      <Text className="text-xs text-muted-foreground">No properties set</Text>
                    )}
                  </View>
                </View>
                <View className="flex-row gap-1">
                  <Button variant="ghost" size="icon" onPress={() => openEdit(status)}>
                    <Pencil size={14} color="#7a9f7a" />
                  </Button>
                  <Button variant="ghost" size="icon" disabled={data.statuses.length <= 1} onPress={() => setDeleteTarget(status)}>
                    <Trash2 size={14} color="#e57373" />
                  </Button>
                </View>
              </View>
            </CardContent>
          </Card>
        ))}
      </View>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Status" : "New Status"}</DialogTitle></DialogHeader>
          <View className="gap-4">
            <View><Label>Name</Label><Input value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="e.g. In Review, On Hold..." /></View>
            <View><Label>Color</Label><ColorSwatchPicker value={form.color} onValueChange={(c) => setForm({ ...form, color: c })} /></View>
            <View className="gap-3">
              <Label>Properties</Label>
              <View className="flex-row items-center gap-2">
                <Checkbox checked={form.isComplete} onCheckedChange={(c) => setForm({ ...form, isComplete: c, isInProgress: c ? false : form.isInProgress })} />
                <Text className="text-sm text-foreground">Is Complete</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Checkbox checked={form.isInProgress} onCheckedChange={(c) => setForm({ ...form, isInProgress: c, isComplete: c ? false : form.isComplete })} />
                <Text className="text-sm text-foreground">Is In Progress</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Checkbox checked={form.isRollable} onCheckedChange={(c) => setForm({ ...form, isRollable: c })} />
                <Text className="text-sm text-foreground">Is Rollable (included in block generation)</Text>
              </View>
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setDialogOpen(false)}><Text className="text-sm text-foreground">Cancel</Text></Button>
            <Button onPress={handleSave} disabled={!form.name.trim()}><Text className="text-sm text-primary-foreground">Save</Text></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Status</AlertDialogTitle><AlertDialogDescription>Delete "{deleteTarget?.name}"? Tasks with this status will be moved to another status.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onPress={() => { if (deleteTarget) { deleteStatus(deleteTarget.id); setDeleteTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollView>
  );
}
