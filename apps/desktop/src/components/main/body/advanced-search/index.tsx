import { SearchIcon } from "lucide-react";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";

import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";
import { AdvancedSearchView } from "./view";

export const TabItemSearch: TabItem<Extract<Tab, { type: "search" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<SearchIcon className="w-4 h-4" />}
      title="Advanced Search"
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

export function TabContentSearch({
  tab,
}: {
  tab: Extract<Tab, { type: "search" }>;
}) {
  return (
    <StandardTabWrapper>
      <SearchView tab={tab} />
    </StandardTabWrapper>
  );
}

function SearchView({ tab }: { tab: Extract<Tab, { type: "search" }> }) {
  const updateSearchTabState = useTabs((state) => state.updateSearchTabState);
  const { openCurrent } = useTabs(
    useShallow((state) => ({
      openCurrent: state.openCurrent,
    })),
  );

  const { selectedTypes } = tab.state;

  const setSelectedTypes = useCallback(
    (types: string[] | null) => {
      updateSearchTabState(tab, {
        ...tab.state,
        selectedTypes: types,
      });
    },
    [updateSearchTabState, tab],
  );

  const handleResultClick = useCallback(
    (type: string, id: string) => {
      if (type === "session") {
        openCurrent({ type: "sessions", id });
      } else if (type === "human") {
        openCurrent({
          type: "contacts",
          state: { selectedPerson: id, selectedOrganization: null },
        });
      } else if (type === "organization") {
        openCurrent({
          type: "contacts",
          state: { selectedOrganization: id, selectedPerson: null },
        });
      }
    },
    [openCurrent],
  );

  return (
    <AdvancedSearchView
      selectedTypes={selectedTypes}
      setSelectedTypes={setSelectedTypes}
      onResultClick={handleResultClick}
    />
  );
}
