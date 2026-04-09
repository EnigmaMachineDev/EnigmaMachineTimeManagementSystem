import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Calendar } from "lucide-react-native";
import { cn } from "@/lib/utils";

// On native, we use @react-native-community/datetimepicker
// On web, we use a simple text input as fallback
let RNDateTimePicker: any = null;
if (Platform.OS !== "web") {
  try {
    RNDateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch {}
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD or ""
  onValueChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onValueChange, placeholder = "Select date...", className }: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const dateObj = value ? new Date(value + "T00:00:00") : new Date();

  const handleNativeChange = (_event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      onValueChange(`${yyyy}-${mm}-${dd}`);
    }
  };

  // Web: use native HTML date input
  if (Platform.OS === "web") {
    return (
      <View className={cn("flex-row items-center gap-2", className)}>
        <Calendar size={16} color="#7a9f7a" />
        <input
          type="date"
          value={value}
          onChange={(e: any) => onValueChange(e.target.value)}
          style={{
            backgroundColor: "#1a2e1a",
            color: "#c8e6c8",
            border: "1px solid #1e3a1e",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 14,
            flex: 1,
          }}
        />
        {value && (
          <Pressable onPress={() => onValueChange("")}>
            <Text className="text-xs text-destructive">Clear</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // Native: use datetimepicker
  return (
    <View className={cn("gap-2", className)}>
      <Pressable
        onPress={() => setShowPicker(true)}
        className="h-10 flex-row items-center gap-2 rounded-md border border-border bg-input px-3"
      >
        <Calendar size={16} color="#7a9f7a" />
        <Text className={cn("text-sm flex-1", value ? "text-foreground" : "text-muted-foreground")}>
          {value || placeholder}
        </Text>
        {value ? (
          <Pressable onPress={() => onValueChange("")}>
            <Text className="text-xs text-destructive">Clear</Text>
          </Pressable>
        ) : null}
      </Pressable>
      {showPicker && RNDateTimePicker && (
        <RNDateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={handleNativeChange}
          themeVariant="dark"
        />
      )}
    </View>
  );
}
