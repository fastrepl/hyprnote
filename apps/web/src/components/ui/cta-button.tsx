"use client";

import { RiAppleFill, RiWindowsFill } from "@remixicon/react";
import { useOS } from "@/hooks/useOS";
import cn from "classnames";
import { PushableButton } from "./pushable-button";

interface CtaButtonProps {
  macText?: React.ReactNode;
  windowsText?: React.ReactNode;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  xs: "text-xs px-2 py-1",
  sm: "text-sm px-3 py-1.5",
  md: "text-base px-4 py-2",
  lg: "text-lg px-6 py-2.5",
  xl: "text-xl px-8 py-3",
};

const defaultContent = {
  mac: {
    short: "Download for Mac",
    full: "Download Hyprnote for Mac",
  },
  windows: {
    short: "Join Waitlist",
    full: "Join Windows Waitlist",
  },
};

export function CtaButton({
  macText,
  windowsText,
  className,
  size = "md",
}: CtaButtonProps) {
  const os = useOS();

  const sizeClass = sizeClasses[size];
  const iconSize = size === "xs" ? "w-3 h-3 mr-1" : "w-4 h-4 mr-2";

  const defaultText =
    os === "Windows"
      ? size === "xs" || size === "sm"
        ? defaultContent.windows.short
        : defaultContent.windows.full
      : size === "xs" || size === "sm"
        ? defaultContent.mac.short
        : defaultContent.mac.full;
  const Icon = os === "Windows" ? RiWindowsFill : RiAppleFill;

  const buttonContent = (
    <div className="flex items-center justify-center">
      <Icon className={iconSize} />
      <span>
        {os === "Windows" ? windowsText || defaultText : macText || defaultText}
      </span>
    </div>
  );

  return (
    <PushableButton className={cn(sizeClass, className)}>
      {buttonContent}
    </PushableButton>
  );
}
