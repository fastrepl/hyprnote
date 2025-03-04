import { Button } from "@hypr/ui/components/ui/button";
import {
  WidgetHeader,
  type WidgetTwoByTwo,
  WidgetTwoByTwoWrapper,
} from "@hypr/ui/components/ui/widgets";
import { Maximize2Icon } from "lucide-react";
import Notes from "../components/notes";
import { mockPastNotes } from "../../mock";

const RelatedPastNotes2x2: WidgetTwoByTwo = ({ onMaximize }) => {
  return (
    <WidgetTwoByTwoWrapper>
      <div className="p-4 pb-0">
        <WidgetHeader
          title={<div className="flex items-center gap-2">Past Notes</div>}
          actions={[
            <Button
              key="maximize"
              variant="ghost"
              size="icon"
              onClick={onMaximize}
              className="p-0"
            >
              <Maximize2Icon size={16} />
            </Button>,
          ]}
        />
      </div>

      <div className="overflow-y-auto flex-1 p-4 pt-0 scrollbar-none">
        <Notes notes={mockPastNotes} />
      </div>
    </WidgetTwoByTwoWrapper>
  );
};

export default RelatedPastNotes2x2;
