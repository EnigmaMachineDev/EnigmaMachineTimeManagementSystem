import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

const STORAGE_KEY = "enigma-time-management-data";
const FILE_NAME = "enigma-data.json";

function getFilePath(): string {
  return `${FileSystem.documentDirectory}${FILE_NAME}`;
}

export async function loadData(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(STORAGE_KEY);
  }
  // Android / iOS — use file system
  try {
    const filePath = getFilePath();
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(filePath);
  } catch {
    return null;
  }
}

export async function saveData(json: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(STORAGE_KEY, json);
    return;
  }
  // Android / iOS — write to file system
  const filePath = getFilePath();
  await FileSystem.writeAsStringAsync(filePath, json);
}
