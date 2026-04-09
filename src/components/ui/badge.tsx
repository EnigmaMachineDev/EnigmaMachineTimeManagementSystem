import React from "react";
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  style?: any;
}

const variantStyles: Record<Variant, string> = {
  default: "bg-primary",
  secondary: "bg-secondary",
  outline: "border border-border bg-transparent",
};

const variantTextStyles: Record<Variant, string> = {
  default: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  outline: "text-foreground",
};

export function Badge({ children, variant = "default", className, style }: BadgeProps) {
  return (
    <View className={cn("flex-row items-center px-2 py-0.5 rounded-full", variantStyles[variant], className)} style={style}>
      {typeof children === "string" ? (
        <Text className={cn("text-xs font-medium", variantTextStyles[variant])}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}
