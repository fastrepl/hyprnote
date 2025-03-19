import { useQuery } from "@tanstack/react-query";
import { ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";
import { toast } from "sonner";

export default function UpdateToastNotification() {
  const checkForUpdate = useQuery({
    enabled: process.env.NODE_ENV === "production",
    queryKey: ["check-for-update"],
    queryFn: () => check(),
    refetchInterval: 1000 * 60,
  });

  useEffect(() => {
    if (checkForUpdate.data?.available) {
      const update = checkForUpdate.data;

      toast.custom(
        (id) => (
          <div className="flex flex-col gap-2 p-4 bg-white border rounded-lg shadow-lg">
            <div className="font-medium">Update Available</div>
            <div className="text-sm text-neutral-600">
              Version {update.version} is available to install
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={async () => {
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
                }}
                className="px-3 py-1.5 text-sm bg-neutral-800 text-white rounded-md hover:bg-neutral-700"
              >
                Update Now
              </button>
              <button
                onClick={() => toast.dismiss(id)}
                className="px-3 py-1.5 text-sm bg-neutral-200 text-neutral-800 rounded-md hover:bg-neutral-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        {
          id: "update-notification",
          duration: Infinity,
        },
      );
    }
  }, [checkForUpdate.data?.available]);

  return null;
}
