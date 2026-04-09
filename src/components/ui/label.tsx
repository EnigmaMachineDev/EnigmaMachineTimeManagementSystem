import React from "react";
import { Text } from "react-native";
import { cn } from "@/lib/utils";

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

export function Label({ children, className }: LabelProps) {
  return (
    <Text className={cn("text-sm font-medium text-foreground mb-1", className)}>
      {children}
    </Text>
  );
}
