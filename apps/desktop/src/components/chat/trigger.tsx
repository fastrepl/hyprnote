import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@hypr/utils";

export function ChatTrigger({
  onClick,
  isCaretNearBottom = false,
}: {
  onClick: () => void;
  isCaretNearBottom?: boolean;
}) {
  const [isMouseNearBottom, setIsMouseNearBottom] = useState(false);

  useEffect(() => {
    if (!isCaretNearBottom) {
      setIsMouseNearBottom(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const threshold = 100;
      const distanceFromBottom = window.innerHeight - e.clientY;
      setIsMouseNearBottom(distanceFromBottom < threshold);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isCaretNearBottom]);

  const shouldHide = isCaretNearBottom && !isMouseNearBottom;

  return createPortal(
    <button
      onClick={onClick}
      className={cn([
        "fixed right-4 z-[100]",
        "w-14 h-14 rounded-full",
        "bg-white shadow-lg hover:shadow-xl",
        "border border-neutral-200",
        "flex items-center justify-center",
        "transition-all duration-200 ease-out",
        "hover:scale-105",
        shouldHide ? "bottom-0 translate-y-[85%]" : "bottom-4",
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
