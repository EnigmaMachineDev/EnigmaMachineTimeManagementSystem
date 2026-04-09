import React from "react";
import { View, Pressable, Text } from "react-native";
import { Check } from "lucide-react-native";
import { Input } from "./Input";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6",
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#64748b", "#78716c",
  "#0ea5e9", "#10b981", "#84cc16", "#a855f7", "#e11d48", "#059669",
  "#d946ef", "#f59e0b", "#06b6d4", "#7c3aed", "#dc2626", "#2563eb",
];

interface ColorSwatchPickerProps {
  value: string;
  onValueChange: (color: string) => void;
}

export function ColorSwatchPicker({ value, onValueChange }: ColorSwatchPickerProps) {
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <Pressable
            key={color}
            onPress={() => onValueChange(color)}
            className={cn(
              "w-8 h-8 rounded-md items-center justify-center border",
              value === color ? "border-foreground" : "border-transparent"
            )}
            style={{ backgroundColor: color }}
          >
            {value === color && <Check size={16} color="#fff" />}
          </Pressable>
        ))}
      </View>
      <View className="flex-row items-center gap-2">
        <View className="w-8 h-8 rounded-md border border-border" style={{ backgroundColor: value }} />
        <Input
          value={value}
          onChangeText={onValueChange}
          placeholder="#rrggbb"
          className="flex-1 font-mono text-sm h-8"
          maxLength={7}
        />
      </View>
    </View>
  );
}
