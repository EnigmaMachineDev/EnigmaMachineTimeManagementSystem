import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useAppContext } from "@/contexts/AppContext";
import { Checkbox } from "@/components/ui/checkbox";

export default function SettingsPage() {
  const { data, updateSettings } = useAppContext();
  const settings = data.settings ?? { showOverdueIndicator: true };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View>
        <Text className="text-2xl font-bold text-foreground">Settings</Text>
        <Text className="text-xs text-muted-foreground mt-1">App preferences</Text>
      </View>

      <View className="rounded-lg border border-border bg-card p-4 gap-3">
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tasks</Text>
        <Pressable
          className="flex-row items-start gap-3"
          onPress={() => updateSettings({ showOverdueIndicator: !settings.showOverdueIndicator })}
        >
          <Checkbox
            checked={settings.showOverdueIndicator}
            onCheckedChange={(c) => updateSettings({ showOverdueIndicator: c })}
          />
          <View className="flex-1">
            <Text className="text-sm text-foreground font-medium">Show overdue indicator on dated tasks</Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              When enabled, tasks past their due date show an "Overdue" badge in red. Disable to hide overdue styling entirely.
            </Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}
