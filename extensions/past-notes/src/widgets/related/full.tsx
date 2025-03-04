import { Minimize2Icon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import {
  type WidgetFullSize,
  WidgetHeader,
  WidgetFullSizeWrapper,
} from "@hypr/ui/components/ui/widgets";

import Notes from "../components/notes";
import { mockPastNotes } from "../../mock";

const RelatedPastNotesFull: WidgetFullSize = ({ onMinimize }) => {
  return (
    <WidgetFullSizeWrapper onMinimize={onMinimize}>
      <div className="p-4 pb-0">
        <WidgetHeader
          title={<div className="flex items-center gap-2">Past Notes</div>}
          actions={[
            <Button
              key="minimize"
              variant="ghost"
              size="icon"
              onClick={onMinimize}
            >
              <Minimize2Icon className="h-4 w-4" />
            </Button>,
          ]}
        />
      </div>

      <div className="overflow-auto flex-1 p-4 pt-0 scrollbar-none">
        <Notes notes={mockPastNotes} />
      </div>
    </WidgetFullSizeWrapper>
  );
};

export default RelatedPastNotesFull;
