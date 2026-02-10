import { getVersion } from "@tauri-apps/api/app";
import { version as osVersion, platform } from "@tauri-apps/plugin-os";
import { useEffect, useState } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";

import type { ContextItem, ContextSource } from "../chat/context-item";

function buildItem(source: ContextSource): ContextItem | null {
  switch (source.type) {
    case "account": {
      if (!source.email && !source.userId) return null;
      const lines: string[] = [];
      if (source.email) lines.push(source.email);
      if (source.userId) lines.push(`ID: ${source.userId}`);
      return {
        key: "support:account",
        label: "Account",
        tooltip: lines.join("\n"),
      };
    }
    case "session": {
      if (!source.title && !source.date) return null;
      const lines: string[] = [];
      if (source.title) lines.push(source.title);
      if (source.date) lines.push(source.date);
      return {
        key: "session:info",
        label: source.title || "Session",
        tooltip: lines.join("\n"),
      };
    }
    case "transcript": {
      if (!source.wordCount) return null;
      return {
        key: "session:transcript",
        label: "Transcript",
        tooltip: `${source.wordCount.toLocaleString()} words`,
      };
    }
    case "note": {
      if (!source.preview) return null;
      const truncated =
        source.preview.length > 120
          ? `${source.preview.slice(0, 120)}...`
          : source.preview;
      return {
        key: "session:note",
        label: "Note",
        tooltip: truncated,
      };
    }
    default:
      return null;
  }
}

async function collectDeviceInfo(): Promise<ContextItem> {
  const lines: string[] = [];
  try {
    const [appVersion, os, gitHashResult] = await Promise.all([
      getVersion(),
      osVersion(),
      miscCommands.getGitHash(),
    ]);
    const gitHash = gitHashResult.status === "ok" ? gitHashResult.data : null;
    lines.push(`Platform: ${platform()}`);
    lines.push(`OS: ${os}`);
    lines.push(`App: ${appVersion}`);
    if (gitHash) lines.push(`Build: ${gitHash}`);
  } catch {}

  const locale = navigator.language || "en";
  lines.push(`Locale: ${locale}`);

  return {
    key: "support:device",
    label: "Device",
    tooltip: lines.join("\n"),
  };
}

export async function collectSupportContextBlock(
  email?: string,
  userId?: string,
): Promise<{ items: ContextItem[]; block: string | null }> {
  const items: ContextItem[] = [];
  const lines: string[] = [];

  if (email || userId) {
    const tooltipLines: string[] = [];
    if (email) {
      lines.push(`- Email: ${email}`);
      tooltipLines.push(email);
    }
    if (userId) {
      lines.push(`- User ID: ${userId}`);
      tooltipLines.push(`ID: ${userId}`);
    }
    items.push({
      key: "support:account",
      label: "Account",
      tooltip: tooltipLines.join("\n"),
    });
  }

  try {
    const [appVersion, os, gitHashResult] = await Promise.all([
      getVersion(),
      osVersion(),
      miscCommands.getGitHash(),
    ]);
    const gitHash = gitHashResult.status === "ok" ? gitHashResult.data : null;
    const deviceLines: string[] = [];
    deviceLines.push(`Platform: ${platform()}`);
    deviceLines.push(`OS: ${os}`);
    deviceLines.push(`App: ${appVersion}`);
    if (gitHash) deviceLines.push(`Build: ${gitHash}`);

    lines.push(`- Platform: ${platform()}`);
    lines.push(`- OS Version: ${os}`);
    lines.push(`- App Version: ${appVersion}`);
    if (gitHash) lines.push(`- Build: ${gitHash}`);

    const locale = navigator.language || "en";
    lines.push(`- Locale: ${locale}`);
    deviceLines.push(`Locale: ${locale}`);

    items.push({
      key: "support:device",
      label: "Device",
      tooltip: deviceLines.join("\n"),
    });
  } catch {}

  if (lines.length === 0) {
    return { items, block: null };
  }

  return {
    items,
    block:
      "---\nThe following is automatically collected context about the current user and their environment. Use it when filing issues or diagnosing problems.\n\n" +
      lines.join("\n"),
  };
}

export function useContextCollection(sources: ContextSource[]): ContextItem[] {
  const [items, setItems] = useState<ContextItem[]>([]);

  const hasDevice = sources.some((s) => s.type === "device");

  const syncItems = sources
    .filter((s) => s.type !== "device")
    .map(buildItem)
    .filter((item): item is ContextItem => item !== null);

  useEffect(() => {
    if (!hasDevice) {
      setItems(syncItems);
      return;
    }

    let stale = false;
    collectDeviceInfo().then((deviceItem) => {
      if (!stale) {
        setItems([...syncItems, deviceItem]);
      }
    });
    return () => {
      stale = true;
    };
  }, [hasDevice, JSON.stringify(syncItems)]);

  if (!hasDevice) return syncItems;
  return items;
}
