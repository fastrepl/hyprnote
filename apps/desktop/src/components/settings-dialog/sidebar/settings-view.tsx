import { UserIcon } from "lucide-react";
import { type NavNames } from "../types";
import { data } from "../constants";
import { cn } from "@hypr/ui/lib/utils";

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
            {data.nav.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => setActive(item.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md p-2",
                    "text-sm font-medium",
                    item.name === active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    "justify-center md:justify-start",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden md:inline-block">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <footer className="mt-auto border-t p-2">
        <button
          onClick={() => setActive("Profile")}
          className={cn(
            "flex w-full items-center gap-2 rounded-md p-2",
            "text-sm font-medium",
            active === "Profile"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            "justify-center md:justify-start",
          )}
        >
          <UserIcon className="h-4 w-4" />
          <span className="hidden md:inline-block">Profile</span>
        </button>
      </footer>
    </div>
  );
}
