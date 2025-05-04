import { type Session } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Trans } from "@lingui/react/macro";
import { GlobeIcon } from "lucide-react";

export interface PublishProps {
  session: Session | null;
}

export const Publish = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-1">
          <Trans>Publish your note</Trans>
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <Trans>Anyone with the link can view this page</Trans>
        </p>
      </div>

      <Button>
        <GlobeIcon className="size-4" />
        <Trans>Make it public</Trans>
      </Button>
    </div>
  );
};
