import "../src/global.css";
import React from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { Drawer } from "expo-router/drawer";
import { AppProvider, useAppContext } from "@/contexts/AppContext";
import { getIcon } from "@/lib/icons";
import { exportJson, importJson } from "@/lib/fileOps";
import {
  LayoutGrid, CircleDot, Flag, Shuffle, Download, Upload, Trash2, LockOpen,
} from "lucide-react-native";
import { usePathname, useRouter } from "expo-router";

function DrawerContent() {
  const { data, exportData, importData, clearAllData } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();

  const handleExport = async () => {
    const json = exportData();
    const filename = `time-management-backup-${new Date().toISOString().split("T")[0]}.json`;
    await exportJson(json, filename);
  };

  const handleImport = async () => {
    const text = await importJson();
    if (!text) return;
    const success = importData(text);
    if (!success) Alert.alert("Error", "Invalid backup file.");
  };

  const handleClear = () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all task types, tasks, statuses, flags, blocks, and settings. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear All Data", style: "destructive", onPress: clearAllData },
      ]
    );
  };

  const NavLink = ({ href, label, icon: Icon, color }: { href: string; label: string; icon: any; color?: string }) => {
    const active = pathname === href;
    return (
      <Pressable
        onPress={() => router.push(href as any)}
        className={`flex-row items-center gap-3 rounded-lg px-3 py-2.5 ${active ? "bg-primary" : ""}`}
      >
        <Icon size={16} color={active ? "#c8e6c8" : (color || "#7a9f7a")} />
        <Text className={`text-sm font-medium ${active ? "text-primary-foreground" : "text-muted-foreground"}`}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-card">
      <View className="p-4 border-b border-border">
        <Text className="text-lg font-bold text-foreground tracking-tight">Enigma TMS</Text>
        <Text className="text-xs text-muted-foreground">Time Management System</Text>
        <Text className="text-xs text-muted-foreground/60 mt-1">v{data.version ?? "2.0.0"}</Text>
      </View>

      <ScrollView className="flex-1 p-3" contentContainerStyle={{ gap: 2 }}>
        <NavLink href="/" label="Task Types" icon={LayoutGrid} />

        {data.taskTypes.length > 0 && (
          <View className="pt-2 pb-1">
            <Text className="px-3 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">
              Tasks
            </Text>
            {data.taskTypes.map((type) => (
              <NavLink
                key={type.id}
                href={`/tasks/${type.id}`}
                label={type.name}
                icon={getIcon(type.icon)}
                color={type.color}
              />
            ))}
          </View>
        )}

        <View className="pt-2">
          <NavLink href="/statuses" label="Statuses" icon={CircleDot} />
          <NavLink href="/flags" label="Flags" icon={Flag} />
          <NavLink href="/generate-block" label="Generate Block" icon={Shuffle} />
        </View>
      </ScrollView>

      <View className="p-3 border-t border-border gap-1">
        <Pressable onPress={handleExport} className="flex-row items-center gap-3 px-3 py-2">
          <Download size={16} color="#7a9f7a" />
          <Text className="text-sm text-muted-foreground">Export Data</Text>
        </Pressable>
        <Pressable onPress={handleImport} className="flex-row items-center gap-3 px-3 py-2">
          <Upload size={16} color="#7a9f7a" />
          <Text className="text-sm text-muted-foreground">Import Data</Text>
        </Pressable>
        <Pressable onPress={handleClear} className="flex-row items-center gap-3 px-3 py-2">
          <Trash2 size={16} color="#e57373" />
          <Text className="text-sm text-destructive">Clear All Data</Text>
        </Pressable>
        <View className="flex-row items-start gap-1.5 px-1 pt-1">
          <LockOpen size={12} color="#7a9f7a50" style={{ marginTop: 2 }} />
          <Text className="text-xs text-muted-foreground/50 leading-tight flex-1">
            Data is stored locally on your device.
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <Drawer
        drawerContent={() => <DrawerContent />}
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0f0a" },
          headerTintColor: "#c8e6c8",
          headerTitleStyle: { fontWeight: "600" },
          drawerStyle: { backgroundColor: "#142014", width: 280 },
          sceneStyle: { backgroundColor: "#0a0f0a" },
        }}
      >
        <Drawer.Screen name="index" options={{ title: "Task Types" }} />
        <Drawer.Screen name="tasks/[typeId]" options={{ title: "Tasks", drawerItemStyle: { display: "none" } }} />
        <Drawer.Screen name="statuses" options={{ title: "Statuses" }} />
        <Drawer.Screen name="flags" options={{ title: "Flags" }} />
        <Drawer.Screen name="generate-block" options={{ title: "Generate Block" }} />
      </Drawer>
    </AppProvider>
  );
}
