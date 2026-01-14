import { useEffect } from "react";

import { commands as db2Commands } from "@hypr/plugin-db2";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import { DEFAULT_USER_ID } from "../../../utils";
import { STORE_ID } from "./main";
import type { Store } from "./main";

export function useInitializeStore(store: Store): void {
  useEffect(() => {
    if (!store) {
      return;
    }

    initializeStore(store);
    void cleanupSqliteSessions();
  }, [store]);
}

async function cleanupSqliteSessions(): Promise<void> {
  if (getCurrentWebviewWindowLabel() !== "main") {
    return;
  }

  const SESSION_TABLES = [
    "sessions",
    "mapping_session_participant",
    "tags",
    "mapping_tag_session",
    "transcripts",
    "enhanced_notes",
  ] as const;

  try {
    const checkResult = await db2Commands.executeLocal(
      `SELECT COUNT(*) as count FROM ${STORE_ID} WHERE _key LIKE 'sessions/%'`,
      [],
    );

    if (checkResult.status === "error" || !checkResult.data?.[0]) {
      return;
    }

    const row = checkResult.data[0];
    if (typeof row !== "object" || row === null || !("count" in row)) {
      return;
    }

    const sessionCount = row.count as number;
    if (sessionCount === 0) {
      return;
    }

    console.log(
      `[Migration] Cleaning up ${sessionCount} session records from SQLite`,
    );

    for (const table of SESSION_TABLES) {
      await db2Commands.executeLocal(
        `DELETE FROM ${STORE_ID} WHERE _key LIKE ?`,
        [`${table}/%`],
      );
    }

    console.log("[Migration] Session cleanup complete");
  } catch (error) {
    console.error("[Migration] Failed to cleanup SQLite sessions:", error);
  }
}

function initializeStore(store: Store): void {
  store.transaction(() => {
    if (!store.hasValue("user_id")) {
      store.setValue("user_id", DEFAULT_USER_ID);
    }

    const userId = store.getValue("user_id") as string;
    if (!store.hasRow("humans", userId)) {
      store.setRow("humans", userId, {
        user_id: userId,
        name: "",
        email: "",
        org_id: "",
      });
    }

    if (
      !store.getTableIds().includes("sessions") ||
      store.getRowIds("sessions").length === 0
    ) {
      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();

      store.setRow("sessions", sessionId, {
        user_id: DEFAULT_USER_ID,
        created_at: now,
        title: "Welcome to Hyprnote",
        raw_md: "",
      });
    }
  });
}
