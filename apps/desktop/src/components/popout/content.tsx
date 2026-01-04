import { platform } from "@tauri-apps/plugin-os";

import { cn } from "@hypr/utils";

import type { Tab } from "../../store/zustand/tabs/schema";
import { TabContentAI } from "../main/body/ai";
import { TabContentCalendar } from "../main/body/calendar";
import { TabContentChangelog } from "../main/body/changelog";
import { TabContentChatShortcut } from "../main/body/chat-shortcuts";
import { TabContentContact } from "../main/body/contacts";
import { TabContentData } from "../main/body/data";
import { TabContentEmpty } from "../main/body/empty";
import {
  TabContentExtension,
  TabContentExtensions,
} from "../main/body/extensions";
import { TabContentFolder } from "../main/body/folders";
import { TabContentHuman } from "../main/body/humans";
import { TabContentPrompt } from "../main/body/prompts";
import { TabContentNote } from "../main/body/sessions";
import { TabContentSettings } from "../main/body/settings";
import { TabContentTemplate } from "../main/body/templates";
import { TrafficLights } from "../window/traffic-lights";

interface PopoutContentProps {
  tab: Tab;
}

export function PopoutContent({ tab }: PopoutContentProps) {
  const isLinux = platform() === "linux";

  return (
    <div className="flex flex-col h-full">
      <div
        data-tauri-drag-region
        className={cn([
          "w-full h-9 flex items-center shrink-0",
          isLinux ? "pl-3" : "pl-[72px]",
        ])}
      >
        {isLinux && <TrafficLights className="mr-2" />}
        <PopoutTitle tab={tab} />
      </div>
      <div className="flex-1 overflow-auto p-1">
        <div className="flex flex-col rounded-xl border border-neutral-200 h-full overflow-hidden">
          <ContentWrapper tab={tab} />
        </div>
      </div>
    </div>
  );
}

function PopoutTitle({ tab }: { tab: Tab }) {
  const title = getTabTitle(tab);

  return (
    <span className="text-sm font-medium text-neutral-600 truncate">
      {title}
    </span>
  );
}

function getTabTitle(tab: Tab): string {
  switch (tab.type) {
    case "sessions":
      return "Note";
    case "contacts":
      return "Contacts";
    case "templates":
      return "Templates";
    case "prompts":
      return "Prompts";
    case "chat_shortcuts":
      return "Chat Shortcuts";
    case "extensions":
      return "Extensions";
    case "humans":
      return "Person";
    case "organizations":
      return "Organization";
    case "folders":
      return "Folder";
    case "empty":
      return "New Tab";
    case "extension":
      return "Extension";
    case "calendar":
      return "Calendar";
    case "changelog":
      return "Changelog";
    case "settings":
      return "Settings";
    case "ai":
      return "AI";
    case "data":
      return "Data";
    default:
      return "Hyprnote";
  }
}

function ContentWrapper({ tab }: { tab: Tab }) {
  if (tab.type === "sessions") {
    return <TabContentNote tab={tab} />;
  }
  if (tab.type === "folders") {
    return <TabContentFolder tab={tab} />;
  }
  if (tab.type === "humans") {
    return <TabContentHuman tab={tab} />;
  }
  if (tab.type === "contacts") {
    return <TabContentContact tab={tab} />;
  }
  if (tab.type === "templates") {
    return <TabContentTemplate tab={tab} />;
  }
  if (tab.type === "prompts") {
    return <TabContentPrompt tab={tab} />;
  }
  if (tab.type === "chat_shortcuts") {
    return <TabContentChatShortcut tab={tab} />;
  }
  if (tab.type === "empty") {
    return <TabContentEmpty tab={tab} />;
  }
  if (tab.type === "calendar") {
    return <TabContentCalendar />;
  }
  if (tab.type === "extension") {
    return <TabContentExtension tab={tab} />;
  }
  if (tab.type === "extensions") {
    return <TabContentExtensions tab={tab} />;
  }
  if (tab.type === "changelog") {
    return <TabContentChangelog tab={tab} />;
  }
  if (tab.type === "settings") {
    return <TabContentSettings tab={tab} />;
  }
  if (tab.type === "ai") {
    return <TabContentAI tab={tab} />;
  }
  if (tab.type === "data") {
    return <TabContentData tab={tab} />;
  }

  return null;
}
