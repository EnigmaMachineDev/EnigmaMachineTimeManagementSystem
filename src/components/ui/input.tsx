import React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

interface InputProps extends TextInputProps {
  className?: string;
}

export function Input({ className, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        "h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
        className
      )}
      placeholderTextColor="#7a9f7a"
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: InputProps) {
  return (
    <TextInput
      multiline
      numberOfLines={3}
      textAlignVertical="top"
      className={cn(
        "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground min-h-[80px]",
        className
      )}
      placeholderTextColor="#7a9f7a"
      {...props}
    />
  );
}
