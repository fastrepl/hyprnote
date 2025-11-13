import { cn } from "@hypr/utils";

import { createPortal } from "react-dom";

export function ChatTrigger({ onClick }: { onClick: () => void }) {
  return createPortal(
    <button
      onClick={onClick}
      className={cn([
        "fixed bottom-4 right-4 z-[100]",
        "w-14 h-14 rounded-full",
        "bg-white shadow-lg hover:shadow-xl",
        "border border-neutral-200",
        "flex items-center justify-center",
        "transition-all duration-200",
        "hover:scale-105",
      ])}
    >
      <img
        src="/assets/dynamic.gif"
        alt="Chat Assistant"
        className="w-12 h-12 object-contain"
      />
    </button>,
    document.body,
  );
}
