import React, { useState } from "react";
import { Modal, View, Text, Pressable, FlatList } from "react-native";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react-native";

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  renderTrigger?: (selected: SelectOption | undefined) => React.ReactNode;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  className,
  triggerClassName,
  renderTrigger,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          "h-9 flex-row items-center justify-between rounded-md border border-border bg-input px-3",
          triggerClassName
        )}
      >
        {renderTrigger ? (
          renderTrigger(selected)
        ) : (
          <Text className={cn("text-sm flex-1", selected ? "text-foreground" : "text-muted-foreground")} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
        )}
        <ChevronDown size={14} color="#7a9f7a" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/60 justify-center items-center px-4" onPress={() => setOpen(false)}>
          <View className="w-full max-w-sm bg-popover rounded-lg border border-border max-h-[60vh]">
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onValueChange(item.value); setOpen(false); }}
                  className={cn(
                    "flex-row items-center gap-2 px-4 py-3 border-b border-border/50",
                    item.value === value && "bg-accent"
                  )}
                >
                  {item.icon}
                  <Text className={cn("text-sm", item.value === value ? "text-foreground font-medium" : "text-foreground")}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
