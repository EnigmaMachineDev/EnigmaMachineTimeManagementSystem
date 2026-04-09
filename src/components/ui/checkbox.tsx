import React from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ checked, onCheckedChange, className }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onCheckedChange(!checked)}
      className={cn(
        "w-5 h-5 rounded border items-center justify-center",
        checked ? "bg-primary border-primary" : "border-border bg-input",
        className
      )}
    >
      {checked && <Check size={14} color="#c8e6c8" />}
    </Pressable>
  );
}
