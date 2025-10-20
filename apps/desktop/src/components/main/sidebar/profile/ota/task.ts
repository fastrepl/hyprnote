import { check } from "@tauri-apps/plugin-updater";

import { updateStore } from "./store";

export const checkForUpdate = async () => {
  updateStore.trigger.setState({ state: "checking" });

  try {
    const update = await check();
    updateStore.trigger.checkSuccess({ update });

    if (!update) {
      setTimeout(() => {
        const currentState = updateStore.getSnapshot().context.state;
        if (currentState === "noUpdate") {
          updateStore.trigger.reset();
        }
      }, 2000);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to check for updates";
    updateStore.trigger.checkError({ error: errorMessage });
  }
};
