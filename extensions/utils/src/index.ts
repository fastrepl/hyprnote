import type { WidgetFullSize, WidgetOneByOne, WidgetTwoByOne, WidgetTwoByTwo } from "@hypr/ui/components/ui/widgets";

export type Extension = {
  [key: string]: WidgetGroup;
};

export type WidgetGroup = {
  id: string;
  items: WidgetItem[];
};

export type WidgetType = WidgetItem["type"];

export type WidgetItem =
  & {
    init: () => Promise<void>;
  }
  & (
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
    }
  );
