import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Sidebar } from "../components/sidebar";

export const Route = createFileRoute("/app/note")({
  component: Component,
});

function Component() {
  const navigate = useNavigate();

  const handleClickSettings = () => {
    windowsCommands.windowShow({ type: "settings" });
  };

  const handleClickNewNote = () => {
    navigate({ to: "/app/new" });
  };

  return (
    <div className="flex flex-row">
      <Sidebar />
      <Outlet />

      <div className="flex flex-col gap-2">
        <button
          className="bg-neutral-700 hover:bg-neutral-800 text-white px-4 py-2 rounded-md"
          onClick={handleClickSettings}
        >
          Setting
        </button>
        <button
          className="bg-neutral-700 hover:bg-neutral-800 text-white px-4 py-2 rounded-md"
          onClick={handleClickNewNote}
        >
          New note
        </button>
      </div>
    </div>
  );
}
