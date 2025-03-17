import { cn } from "@hypr/ui/lib/utils";
import { Trans } from "@lingui/react/macro";
import {
  BellIcon,
  BlocksIcon,
  CalendarIcon,
  CreditCardIcon,
  FileTextIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { type NavNames } from "../types";

export interface SettingsViewProps {
  active: NavNames | "Profile";
  setActive: (name: NavNames | "Profile") => void;
}

export function SettingsView({ active, setActive }: SettingsViewProps) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex-1 overflow-auto py-2">
        <nav>
          <ul className="space-y-1 px-2">
            <li>
              <button
                onClick={() => setActive("General")}
                className={cn(
                  "h-9 flex w-full items-center justify-center md:justify-start gap-2 rounded-lg p-2 text-sm text-neutral-600 focus:outline-none",
                  active === "General" ? "bg-neutral-200" : "hover:bg-neutral-100",
                )}
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden md:inline-block">
                  <Trans>General</Trans>
                </span>
              </button>
            </li>

            <li>
              <button
                onClick={() => setActive("Calendar")}
                className={cn(
                  "h-9 flex w-full items-center justify-center md:justify-start gap-2 rounded-lg p-2 text-sm text-neutral-600 focus:outline-none",
                  active === "Calendar" ? "bg-neutral-200" : "hover:bg-neutral-100",
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden md:inline-block">
                  <Trans>Calendar</Trans>
                </span>
              </button>
            </li>

            <li>
              <button
                onClick={() => setActive("Notifications")}
                className={cn(
                  "h-9 flex w-full items-center justify-center md:justify-start gap-2 rounded-lg p-2 text-sm text-neutral-600 focus:outline-none",
                  active === "Notifications" ? "bg-neutral-200" : "hover:bg-neutral-100",
                )}
              >
                <BellIcon className="h-4 w-4" />
                <span className="hidden md:inline-block">
                  <Trans>Notifications</Trans>
                </span>
              </button>
            </li>

            <li>
              <button
                onClick={() => setActive("Templates")}
                className={cn(
                  "h-9 flex w-full items-center justify-center md:justify-start gap-2 rounded-lg p-2 text-sm text-neutral-600 focus:outline-none",
                  active === "Templates" ? "bg-neutral-200" : "hover:bg-neutral-100",
                )}
              >
                <FileTextIcon className="h-4 w-4" />
                <span className="hidden md:inline-block">
                  <Trans>Templates</Trans>
                </span>
              </button>
            </li>

            <li>
              <button
                onClick={() => setActive("Extensions")}
                className={cn(
                  "h-9 flex w-full items-center justify-center md:justify-start gap-2 rounded-lg p-2 text-sm text-neutral-600 focus:outline-none",
                  active === "Extensions" ? "bg-neutral-200" : "hover:bg-neutral-100",
                )}
              >
                <BlocksIcon className="h-4 w-4" />
                <span className="hidden md:inline-block">
                  <Trans>Extensions</Trans>
                </span>
              </button>
            </li>

            <li>
              <button
                onClick={() => setActive("Team")}
                className={cn(
                  "h-9 flex w-full items-center justify-center md:justify-start gap-2 rounded-lg p-2 text-sm text-neutral-600 focus:outline-none",
                  active === "Team" ? "bg-neutral-200" : "hover:bg-neutral-100",
                )}
              >
                <UsersIcon className="h-4 w-4" />
                <span className="hidden md:inline-block">
                  <Trans>Team</Trans>
                </span>

                <div className="ml-auto text-xs hidden md:inline-block">
                  <Trans>Coming Soon</Trans>
                </div>
              </button>
            </li>

            <li>
              <button
                onClick={() => setActive("Billing")}
                className={cn(
                  "h-9 flex w-full items-center justify-center md:justify-start gap-2 rounded-lg p-2 text-sm text-neutral-600 focus:outline-none",
                  active === "Billing" ? "bg-neutral-200" : "hover:bg-neutral-100",
                )}
              >
                <CreditCardIcon className="h-4 w-4" />
                <span className="hidden md:inline-block">
                  <Trans>Billing</Trans>
                </span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <footer className="mt-auto border-t p-2">
        <button
          onClick={() => setActive("Profile")}
          className={cn(
            "h-9 flex w-full items-center justify-center md:justify-start gap-2 rounded-lg p-2 text-sm text-neutral-600 focus:outline-none",
            active === "Profile"
              ? "bg-neutral-200"
              : "hover:bg-neutral-100",
          )}
        >
          <UserIcon className="h-4 w-4" />
          <span className="hidden md:inline-block">
            <Trans>Profile</Trans>
          </span>
        </button>
      </footer>
    </div>
  );
}
