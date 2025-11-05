import { createFileRoute, Outlet, useRouteContext } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

import { buildChatTools } from "../../../chat/tools";
import { AITaskProvider } from "../../../contexts/ai-task";
import { useSearchEngine } from "../../../contexts/search/engine";
import { SearchEngineProvider } from "../../../contexts/search/engine";
import { SearchUIProvider } from "../../../contexts/search/ui";
import { ShellProvider } from "../../../contexts/shell";
import { useRegisterTools } from "../../../contexts/tool";
import { ToolRegistryProvider } from "../../../contexts/tool";
import { useTabs } from "../../../store/zustand/tabs";

export const Route = createFileRoute("/app/main/_layout")({
  component: Component,
});

function Component() {
  const { persistedStore, aiTaskStore, toolRegistry } = useRouteContext({ from: "__root__" });
  const { registerOnClose, registerOnEmpty, currentTab, openNew, invalidateResource } = useTabs();

  const openDefaultEmptyTab = useCallback(() => {
    openNew({ type: "empty" });
  }, [openNew]);

  useEffect(() => {
    registerOnClose((tab) => {
      if (tab.type === "sessions" && persistedStore) {
        const row = persistedStore.getRow("sessions", tab.id);
        if (!row) {
          return;
        }

        if (!row.title && !row.raw_md && !row.enhanced_md) {
          let hasTranscript = false;
          persistedStore.forEachRow("transcripts", (transcriptId, _forEachCell) => {
            const sessionId = persistedStore.getCell("transcripts", transcriptId, "session_id");
            if (sessionId === tab.id) {
              hasTranscript = true;
            }
          });

          if (!hasTranscript) {
            invalidateResource("sessions", tab.id);
            persistedStore.delRow("sessions", tab.id);
          }
        }
      }
    });
  }, [persistedStore, registerOnClose, invalidateResource]);

  useEffect(() => {
    if (!currentTab) {
      openDefaultEmptyTab();
    }
  }, [currentTab, openDefaultEmptyTab]);

  useEffect(() => {
    registerOnEmpty(openDefaultEmptyTab);
  }, [openDefaultEmptyTab, registerOnEmpty]);

  if (!aiTaskStore) {
    return null;
  }

  return (
    <SearchEngineProvider store={persistedStore}>
      <SearchUIProvider>
        <ShellProvider>
          <ToolRegistryProvider registry={toolRegistry}>
            <AITaskProvider store={aiTaskStore}>
              <ToolRegistration />
              <Outlet />
            </AITaskProvider>
          </ToolRegistryProvider>
        </ShellProvider>
      </SearchUIProvider>
    </SearchEngineProvider>
  );
}

function ToolRegistration() {
  const { search } = useSearchEngine();

  useRegisterTools(
    "chat",
    () => buildChatTools({ search }),
    [search],
  );

  return null;
}
