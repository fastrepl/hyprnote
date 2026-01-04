import {
  createFileRoute,
  Outlet,
  useRouteContext,
} from "@tanstack/react-router";

import { buildChatTools } from "../../../chat/tools";
import { AITaskProvider } from "../../../contexts/ai-task";
import { NotificationProvider } from "../../../contexts/notifications";
import { useSearchEngine } from "../../../contexts/search/engine";
import { SearchEngineProvider } from "../../../contexts/search/engine";
import { SearchUIProvider } from "../../../contexts/search/ui";
import { ShellProvider } from "../../../contexts/shell";
import { useRegisterTools } from "../../../contexts/tool";
import { ToolRegistryProvider } from "../../../contexts/tool";

export const Route = createFileRoute("/app/popout/_layout")({
  component: Component,
});

function Component() {
  const { persistedStore, aiTaskStore, toolRegistry } = useRouteContext({
    from: "__root__",
  });

  if (!aiTaskStore) {
    return null;
  }

  return (
    <SearchEngineProvider store={persistedStore}>
      <SearchUIProvider>
        <ShellProvider>
          <ToolRegistryProvider registry={toolRegistry}>
            <AITaskProvider store={aiTaskStore}>
              <NotificationProvider>
                <ToolRegistration />
                <Outlet />
              </NotificationProvider>
            </AITaskProvider>
          </ToolRegistryProvider>
        </ShellProvider>
      </SearchUIProvider>
    </SearchEngineProvider>
  );
}

function ToolRegistration() {
  const { search } = useSearchEngine();

  useRegisterTools("chat", () => buildChatTools({ search }), [search]);

  return null;
}
