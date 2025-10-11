import { CalendarIcon, CheckSquare, Mail, Sun } from "lucide-react";
import { format } from "date-fns";

import { type Tab } from "../../../store/zustand/tabs";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemDaily: TabItem = ({ tab, handleClose, handleSelect }) => {
  return (
    <TabItemBase
      icon={<Sun className="w-4 h-4" />}
      title={tab.type === "daily" ? format(tab.date, "MMM d, yyyy") : "Daily Note"}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

export function TabContentDaily({ tab }: { tab: Tab }) {
  if (tab.type !== "daily") {
    return null;
  }

  return (
    <div className="h-full rounded-lg border bg-white p-6">
      <h1 className="text-2xl font-semibold mb-6">{format(tab.date, "MMM d, yyyy")}</h1>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Task</h2>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded">
                <CheckSquare className="w-4 h-4 text-neutral-400" />
                <span className="text-sm">task {i}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Email</h2>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span className="text-sm">email {i}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <h2 className="text-lg font-semibold mb-4">Event</h2>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded">
                <CalendarIcon className="w-4 h-4 text-neutral-400" />
                <span className="text-sm">event {i}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
