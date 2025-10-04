import { type Session } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";

import { GlobeIcon } from "lucide-react";

export interface PublishProps {
  session: Session | null;
}

export const Publish = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-1">
          Publish your note
        </h3>
        <p className="text-sm text-neutral-600">
          Anyone with the link can view this page
        </p>
      </div>

      <Button>
        <GlobeIcon className="size-4" />
        Make it public
      </Button>
    </div>
  );
};
