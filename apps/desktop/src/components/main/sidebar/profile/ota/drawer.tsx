import { CheckCircle, X } from "lucide-react";

import {
  BottomSheet,
  BottomSheetContent,
} from "@hypr/ui/components/ui/bottom-sheet";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useOTA } from "./task";

export function UpdateDrawer() {
  const { state, update, showDrawer, handleCloseDrawer, handleInstall } =
    useOTA();

  const isReady = state === "ready";
  const shouldShow = showDrawer && isReady;

  return (
    <BottomSheet open={shouldShow} onClose={handleCloseDrawer}>
      <BottomSheetContent className="bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-neutral-900">
                {`v${update?.version || "Update"} is ready`}
              </h3>
              <p className="text-sm text-neutral-500">
                Restart the app to apply the update
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseDrawer}
            className={cn([
              "flex h-8 w-8 items-center justify-center",
              "rounded-full",
              "hover:bg-neutral-100",
              "transition-colors",
            ])}
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCloseDrawer}
            className="flex-1"
          >
            Later
          </Button>
          <Button size="sm" onClick={handleInstall} className="flex-1">
            Restart now
          </Button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
