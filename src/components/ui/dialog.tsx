import React from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => onOpenChange(false)}>
      <Pressable className="flex-1 bg-black/60 justify-center items-center px-4" onPress={() => onOpenChange(false)}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-lg">
          <ScrollView className="bg-card rounded-lg border border-border max-h-[85vh]" keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn("p-5 gap-4", className)}>{children}</View>;
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn("gap-1", className)}>{children}</View>;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-lg font-semibold text-foreground", className)}>{children}</Text>;
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn("flex-row justify-end gap-2 pt-2", className)}>{children}</View>;
}

// AlertDialog reuses the same primitives
export const AlertDialog = Dialog;
export const AlertDialogContent = DialogContent;
export const AlertDialogHeader = DialogHeader;
export const AlertDialogTitle = DialogTitle;
export const AlertDialogFooter = DialogFooter;

export function AlertDialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-sm text-muted-foreground", className)}>{children}</Text>;
}

export function AlertDialogAction({ children, onPress, className }: { children: React.ReactNode; onPress?: () => void; className?: string }) {
  return (
    <Pressable onPress={onPress} className={cn("bg-primary px-4 py-2 rounded-md", className)}>
      {typeof children === "string" ? (
        <Text className="text-sm font-medium text-primary-foreground">{children}</Text>
      ) : children}
    </Pressable>
  );
}

export function AlertDialogCancel({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} className="border border-border px-4 py-2 rounded-md">
      {typeof children === "string" ? (
        <Text className="text-sm font-medium text-foreground">{children}</Text>
      ) : children}
    </Pressable>
  );
}
