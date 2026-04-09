import React from "react";
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <View className={cn("rounded-lg border border-border bg-card overflow-hidden", className)}>
      {children}
    </View>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <View className={cn("p-4", className)}>
      {children}
    </View>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={cn("text-base font-semibold text-card-foreground", className)}>
      {children}
    </Text>
  );
}

export function CardContent({ children, className }: CardProps) {
  return (
    <View className={cn("px-4 pb-4", className)}>
      {children}
    </View>
  );
}
