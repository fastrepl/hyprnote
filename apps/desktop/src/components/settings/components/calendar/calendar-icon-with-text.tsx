import { RiAppleFill as AppleIcon } from "@remixicon/react";

import { type CalendarIntegration } from "@/types";

export function CalendarIconWithText({ type }: { type: CalendarIntegration }) {
  return (
    <div className="flex flex-row items-center gap-2">
      {type === "apple-calendar"
        ? <AppleIcon size={16} />
        : type === "google-calendar"
        ? <GoogleIcon />
        : <OutlookIcon />}
      <span className="text-sm">
        {type === "apple-calendar"
          ? "Apple"
          : type === "google-calendar"
          ? "Google"
          : type === "outlook-calendar"
          ? "Outlook"
          : null}
      </span>
    </div>
  );
}

export function GoogleIcon() {
  return <img className="h-4 w-4" src="/icons/gcal.svg" />;
}

export function OutlookIcon() {
  return <img className="h-4 w-4" src="/icons/outlook.svg" />;
}
