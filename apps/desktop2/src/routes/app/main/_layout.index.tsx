import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@hypr/ui/components/ui/resizable";
import { useLeftSidebar, useRightPanel } from "@hypr/utils/contexts";
import { Chat } from "../../../components/chat";
import { LeftSidebar } from "../../../components/main/left-sidebar";
import { MainContent, MainHeader } from "../../../components/main/main-area";
import { tabSchema } from "../../../types";
import { id } from "../../../utils";

const validateSearch = z.object({
  new: z.boolean().default(false),
  tabs: z.array(tabSchema).default([]),
});

export const Route = createFileRoute("/app/main/_layout/")({
  validateSearch,
  beforeLoad: ({ search, context: { internalStore, persistedStore } }) => {
    if (search.new) {
      const sessionId = id();
      const user_id = internalStore!.getValue("user_id")!;

      persistedStore!.setRow("sessions", sessionId, {
        title: "new",
        user_id,
        created_at: new Date().toISOString(),
      });

      throw redirect({
        to: "/app/main",
        search: {
          ...search,
          tabs: [
            ...search.tabs.map((t) => ({ ...t, active: false })),
            {
              id: sessionId,
              type: "sessions",
              active: true,
            },
          ],
          new: false,
        },
      });
    }

    if (search.tabs.length === 0) {
      throw redirect({ to: "/app/main", search: { new: true } });
    }

    const activeTabs = search.tabs.filter((t) => t.active);

    if (activeTabs.length > 1) {
      const normalizedTabs = search.tabs.map((t, idx) => ({
        ...t,
        active: activeTabs.length === 0 ? idx === 0 : t.id === activeTabs[0].id,
      }));

      throw redirect({
        to: "/app/main",
        search: { tabs: normalizedTabs },
      });
    } else if (activeTabs.length === 0) {
      throw redirect({
        to: "/app/main",
        search: { tabs: search.tabs.map((t, idx) => ({ ...t, active: idx === 0 })) },
      });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps: { tabs } }) => ({ tabs }),
  component: Component,
});

function Component() {
  const { tabs } = Route.useLoaderData();
  const { isExpanded: isRightPanelExpanded } = useRightPanel();
  const { isExpanded: isLeftPanelExpanded } = useLeftSidebar();

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {isLeftPanelExpanded && (
        <>
          <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
            <LeftSidebar />
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      )}
      <ResizablePanel>
        <div className="flex flex-col h-full">
          <MainHeader />
          {isRightPanelExpanded
            ? (
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={60} minSize={30}>
                  <MainContent tabs={tabs} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30}>
                  <Chat />
                </ResizablePanel>
              </ResizablePanelGroup>
            )
            : <MainContent tabs={tabs} />}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
