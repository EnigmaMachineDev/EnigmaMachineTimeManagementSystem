import {
  Home, Briefcase, Gamepad2, BookOpen, Music, Camera, Heart, Star,
  ShoppingCart, Dumbbell, Palette, Code, Wrench, Car, Plane, Coffee,
  Utensils, Dog, Sun, Moon, Mountain, Globe, Leaf, Zap, Flame,
  GraduationCap, Hammer, Laptop, Phone, Tv, Trophy, Target, Clock,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Home, Briefcase, Gamepad2, BookOpen, Music, Camera, Heart, Star,
  ShoppingCart, Dumbbell, Palette, Code, Wrench, Car, Plane, Coffee,
  Utensils, Dog, Sun, Moon, Mountain, Globe, Leaf, Zap, Flame,
  GraduationCap, Hammer, Laptop, Phone, Tv, Trophy, Target, Clock,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Home;
}
