import React from "react";
import { createRoot } from "react-dom/client";
import { TipsModal } from "./index";

export function showTipsModal(userId?: string): Promise<void> {
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
      React.createElement(TipsModal, {
        isOpen: true,
        onClose: handleClose,
        userId: userId,
      }),
    );
  });
}
