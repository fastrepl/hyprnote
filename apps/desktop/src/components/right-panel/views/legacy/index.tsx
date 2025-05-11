import { WidgetFullSize, WidgetFullSizeWrapper } from "./ui";

import { TranscriptBase } from "./base";

const TranscriptFull: WidgetFullSize = ({ queryClient, onMinimize }) => {
  return (
    <TranscriptBase
      WrapperComponent={WidgetFullSizeWrapper}
      wrapperProps={{ queryClient, onMinimize }}
    />
  );
};

export default TranscriptFull;
