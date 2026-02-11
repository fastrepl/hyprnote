import { MessageCircle } from "lucide-react";

import { useShell } from "../../../../contexts/shell";
import * as main from "../../../../store/tinybase/store/main";
import type { Tab } from "../../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "../shared";

export const TabItemChat: TabItem<Extract<Tab, { type: "chat" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  const { chat } = useShell();
  const chatTitle = main.UI.useCell(
    "chat_groups",
    tab.state.groupId || "",
    "title",
    main.STORE_ID,
  );

  const isSupport = tab.state.chatType === "support";

  return (
    <TabItemBase
      icon={<MessageCircle className="w-4 h-4" />}
      title={isSupport ? "Chat (Support)" : chatTitle || "Chat"}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      accent={isSupport ? "blue" : "neutral"}
      handleCloseThis={() => {
        chat.sendEvent({ type: "CLOSE" });
        handleCloseThis(tab);
      }}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={() => {
        chat.sendEvent({ type: "CLOSE" });
        handleCloseAll();
      }}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};
