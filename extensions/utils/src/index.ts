export { formatTime } from "./time";

import type {
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
  component: WidgetTwoByTwo | WidgetOneByOne | WidgetTwoByOne | WidgetFullSize;
}
