import { useQuery } from "@tanstack/react-query";
import { ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import clsx from "clsx";

export default function UpdateButton() {
  const checkForUpdate = useQuery({
    enabled: process.env.NODE_ENV === "production",
    queryKey: ["check-for-update"],
    queryFn: () => check(),
    refetchInterval: 1000 * 60,
  });

  if (!checkForUpdate.data?.available) {
    return null;
  }

  const handleClick = async () => {
    const update = checkForUpdate.data;
    if (!update) {
      return;
    }

    const yes = await ask(
      `
    Update to ${update.version} is available!
    Release notes: ${update.body}
            `,
      {
        title: "Update Now!",
        kind: "info",
        okLabel: "Update",
        cancelLabel: "Cancel",
      },
    );

    if (yes) {
      await update.downloadAndInstall();
      await relaunch();
    }
  };

  return (
    <div className="flex items-center p-2">
      <button
        onClick={handleClick}
        className={clsx([
          "w-full px-2 py-1.5 rounded-md",
          "bg-neutral-200 ",
          "hover:bg-neutral-300 ",
          "text-neutral-900  ",
        ])}
      >
        Update
      </button>
    </div>
  );
}
