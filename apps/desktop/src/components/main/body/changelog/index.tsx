import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon, SparklesIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";

import { type Tab } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";

export const TabItemChangelog: TabItem<Extract<Tab, { type: "changelog" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  return (
    <TabItemBase
      icon={<SparklesIcon className="w-4 h-4" />}
      title="What's New"
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentChangelog({
  tab,
}: {
  tab: Extract<Tab, { type: "changelog" }>;
}) {
  const version = tab.state?.version;

  return (
    <StandardTabWrapper>
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="p-4 rounded-full bg-neutral-100">
            <SparklesIcon className="w-8 h-8 text-neutral-600" />
          </div>

          <h1 className="text-2xl font-semibold text-neutral-900">
            {version ? `Welcome to v${version}` : "What's New"}
          </h1>

          <p className="text-neutral-600">
            Hyprnote has been updated with new features and improvements. Check
            out the changelog to see what's new.
          </p>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => openUrl("https://hyprnote.com/changelog")}
          >
            <ExternalLinkIcon className="w-4 h-4" />
            View Changelog
          </Button>
        </div>
      </div>
    </StandardTabWrapper>
  );
}
