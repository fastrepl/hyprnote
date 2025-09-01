import React from "react";
import { createRoot } from "react-dom/client";
import { ProGateModal } from "./index";
import type { ProGateType } from "./types";

export function showProGateModal(type: ProGateType): Promise<void> {
  return new Promise((resolve) => {
    const modalDiv = document.createElement("div");
    document.body.appendChild(modalDiv);

    const root = createRoot(modalDiv);

    const handleClose = () => {
      root.unmount();
      document.body.removeChild(modalDiv);
      resolve();
    };

    root.render(
      React.createElement(ProGateModal, {
        isOpen: true,
        onClose: handleClose,
        type: type,
      }),
    );
  });
}
