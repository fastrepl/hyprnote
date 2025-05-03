import type { LucideIcon } from "lucide-react";
import { Bell, Blocks, FlaskConical, MessageSquare, Settings, Sparkles, Volume2 } from "lucide-react";

export type Tab = "general" | "ai" | "notifications" | "sound" | "extensions" | "lab" | "feedback";

export const TABS: { name: Tab; icon: LucideIcon }[] = [
  { name: "general", icon: Settings },
  { name: "ai", icon: Sparkles },
  { name: "notifications", icon: Bell },
  { name: "sound", icon: Volume2 },
  { name: "extensions", icon: Blocks },
  { name: "lab", icon: FlaskConical },
  { name: "feedback", icon: MessageSquare },
];
