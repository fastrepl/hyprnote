import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon, GitCompareArrowsIcon, SparklesIcon } from "lucide-react";

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
}) => (
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

export function TabContentChangelog({ tab }: { tab: Extract<Tab, { type: "changelog" }> }) {
  const { previous, current } = tab.state;

  return (
    <StandardTabWrapper>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">Updated to v{current}</h1>
          {previous && <p className="mt-1 text-sm text-neutral-500">from v{previous}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => openUrl(`https://hyprnote.com/changelog/v${current}`)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <ExternalLinkIcon className="w-4 h-4" />
            View Changelog
          </button>
          {previous && (
            <button
              onClick={() =>
                openUrl(`https://github.com/fastrepl/hyprnote/compare/v${previous}...v${current}`)
              }
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <GitCompareArrowsIcon className="w-4 h-4" />
              View GitHub Diff
            </button>
          )}
        </div>
      </div>
    </StandardTabWrapper>
  );
}
