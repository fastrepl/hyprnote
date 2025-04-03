import { ExtensionWidgetKind } from "@hypr/plugin-db";
import type { WidgetFullSize, WidgetOneByOne, WidgetTwoByOne, WidgetTwoByTwo } from "@hypr/ui/components/ui/widgets";

import { assert, type TypeEqualityGuard } from "./utils";

export type Extension = {
  id: string;
  init: () => Promise<void>;
  configComponent?: React.ReactNode;
  widgetGroups: Array<WidgetGroup>;
};

export type WidgetGroup = {
  id: string;
  items: WidgetItem[];
};

export type WidgetType = WidgetItem["type"];

assert<TypeEqualityGuard<WidgetType, ExtensionWidgetKind>>();

export type WidgetItem =
  | {
    type: "oneByOne";
    component: WidgetOneByOne;
  }
  | {
    type: "twoByOne";
    component: WidgetTwoByOne;
  }
  | {
    type: "twoByTwo";
    component: WidgetTwoByTwo;
  }
  | {
    type: "full";
    component: WidgetFullSize;
  };
