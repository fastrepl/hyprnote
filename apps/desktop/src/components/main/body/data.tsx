import { DatabaseIcon, DownloadIcon, UploadIcon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { type Tab, useTabs } from "../../../store/zustand/tabs";
import { Export } from "../../settings/data/export";
import { Import } from "../../settings/data/import";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";

type DataTabKey = "import" | "export";

export const TabItemData: TabItem<Extract<Tab, { type: "data" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  const suffix = tab.state.tab === "import" ? "Import" : "Export";

  return (
    <TabItemBase
      icon={<DatabaseIcon className="w-4 h-4" />}
      title={
        <div className="flex items-center gap-1">
          <span>Data</span>
          <span className="text-xs text-neutral-400">({suffix})</span>
        </div>
      }
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentData({
  tab,
}: {
  tab: Extract<Tab, { type: "data" }>;
}) {
  return (
    <StandardTabWrapper>
      <DataView tab={tab} />
    </StandardTabWrapper>
  );
}

function DataView({ tab }: { tab: Extract<Tab, { type: "data" }> }) {
  const updateDataTabState = useTabs((state) => state.updateDataTabState);
  const activeTab = tab.state.tab ?? "import";

  const setActiveTab = useCallback(
    (newTab: DataTabKey) => {
      updateDataTabState(tab, { tab: newTab });
    },
    [updateDataTabState, tab],
  );

  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden">
      <div className="flex gap-1 px-6 pt-6 pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("import")}
          className={cn([
            "px-1 gap-1.5 h-7 border border-transparent",
            activeTab === "import" && "bg-neutral-100 border-neutral-200",
          ])}
        >
          <UploadIcon size={14} />
          <span className="text-xs">Import</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab("export")}
          className={cn([
            "px-1 gap-1.5 h-7 border border-transparent",
            activeTab === "export" && "bg-neutral-100 border-neutral-200",
          ])}
        >
          <DownloadIcon size={14} />
          <span className="text-xs">Export</span>
        </Button>
      </div>
      <div className="flex-1 w-full overflow-y-auto scrollbar-hide px-6 pb-6">
        {activeTab === "import" ? <Import /> : <Export />}
      </div>
    </div>
  );
}
