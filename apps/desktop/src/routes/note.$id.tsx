import { createFileRoute } from "@tanstack/react-router";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import Editor from "../components/editor";
import { useUI } from "../stores/ui";
import { useSuspenseQuery } from "@tanstack/react-query";

const queryOptions = (id: string) => ({
  queryKey: ["note", { id }],
  queryFn: () => {
    return {};
  },
});

export const Route = createFileRoute("/note/$id")({
  component: Component,
  loader: ({ context: { queryClient }, params: { id } }) => {
    return queryClient.ensureQueryData(queryOptions(id));
  },
});

function Component() {
  const { id } = Route.useParams();
  const { data: _note } = useSuspenseQuery(queryOptions(id));

  const { isPanelOpen } = useUI();

  return (
    <div>
      <PanelGroup direction="horizontal">
        <Panel>
          <Editor />
        </Panel>
        {!isPanelOpen && (
          <>
            <PanelResizeHandle />
            <Panel defaultSize={30} minSize={30} maxSize={60}>
              <div>side panel</div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}
