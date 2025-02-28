export { formatTime } from "./time";

import {
  WidgetOneByOne,
  WidgetTwoByOne,
  WidgetTwoByTwo,
  WidgetFullSize,
} from "@hypr/ui/components/ui/widgets";

export interface Extension {
  [key: string]: Widget[];
}

export interface Widget {
  id: string;
  init: () => Promise<void>;
  component:
    | typeof WidgetOneByOne
    | typeof WidgetTwoByOne
    | typeof WidgetTwoByTwo
    | typeof WidgetFullSize;
}
