import type { LucideIcon } from "lucide-react";
import { Bell, Calendar, FlaskConical, MessageSquare, Settings, Sparkles, Volume2 } from "lucide-react";

export type Tab = "general" | "calendar" | "ai" | "notifications" | "sound" | "lab" | "feedback";

export const TABS: { name: Tab; icon: LucideIcon }[] = [
  { name: "general", icon: Settings },
  { name: "calendar", icon: Calendar },
  { name: "ai", icon: Sparkles },
  { name: "notifications", icon: Bell },
  { name: "sound", icon: Volume2 },
  { name: "lab", icon: FlaskConical },
  { name: "feedback", icon: MessageSquare },
];
