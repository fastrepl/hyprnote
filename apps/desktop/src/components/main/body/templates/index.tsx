import { BookTextIcon } from "lucide-react";
import { useCallback } from "react";

import type { TemplateSection, TemplateStorage } from "@hypr/store";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

import * as main from "../../../../store/tinybase/main";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { TemplateDetailsColumn } from "./details";
import { TemplatesListColumn } from "./list";

export const TabItemTemplate: TabItem<Extract<Tab, { type: "templates" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  return (
    <TabItemBase
      icon={<BookTextIcon className="w-4 h-4" />}
      title={"Templates"}
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentTemplate({
  tab,
}: {
  tab: Extract<Tab, { type: "templates" }>;
}) {
  return (
    <StandardTabWrapper>
      <TemplateView tab={tab} />
    </StandardTabWrapper>
  );
}

function TemplateView({ tab }: { tab: Extract<Tab, { type: "templates" }> }) {
  const updateTemplatesTabState = useTabs(
    (state) => state.updateTemplatesTabState,
  );

  const { selectedTemplate } = tab.state;
  const { user_id } = main.UI.useValues(main.STORE_ID);

  const setSelectedTemplate = useCallback(
    (value: string | null) => {
      updateTemplatesTabState(tab, {
        ...tab.state,
        selectedTemplate: value,
      });
    },
    [updateTemplatesTabState, tab],
  );

  const deleteTemplateFromStore = main.UI.useDelRowCallback(
    "templates",
    (template_id: string) => template_id,
    main.STORE_ID,
  );

  const handleDeleteTemplate = useCallback(
    (id: string) => {
      deleteTemplateFromStore(id);
      setSelectedTemplate(null);
    },
    [deleteTemplateFromStore, setSelectedTemplate],
  );

  const setRow = main.UI.useSetRowCallback(
    "templates",
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      title: string;
      description: string;
      sections: TemplateSection[];
    }) => p.id,
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      title: string;
      description: string;
      sections: TemplateSection[];
    }) =>
      ({
        user_id: p.user_id,
        created_at: p.created_at,
        title: p.title,
        description: p.description,
        sections: JSON.stringify(p.sections),
      }) satisfies TemplateStorage,
    [],
    main.STORE_ID,
  );

  const handleCloneTemplate = useCallback(
    (template: {
      title: string;
      description: string;
      sections: TemplateSection[];
    }) => {
      if (!user_id) {
        return;
      }

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      setRow({
        id: newId,
        user_id,
        created_at: now,
        title: template.title,
        description: template.description,
        sections: template.sections.map((section) => ({ ...section })),
      });

      setSelectedTemplate(newId);
    },
    [user_id, setRow, setSelectedTemplate],
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
        <TemplatesListColumn
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          onCloneTemplate={handleCloneTemplate}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} minSize={50}>
        <TemplateDetailsColumn
          selectedTemplateId={selectedTemplate}
          handleDeleteTemplate={handleDeleteTemplate}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
