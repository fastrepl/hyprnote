import * as React from "react";
import * as ReactDOM from "react-dom";
import * as jsxRuntime from "react/jsx-runtime";

import * as Button from "@hypr/ui/components/ui/button";
import * as ButtonGroup from "@hypr/ui/components/ui/button-group";
import * as Card from "@hypr/ui/components/ui/card";
import * as Checkbox from "@hypr/ui/components/ui/checkbox";
import * as Popover from "@hypr/ui/components/ui/popover";
import * as utils from "@hypr/utils";

import * as main from "./store/tinybase/main";
import { useTabs } from "./store/zustand/tabs";

declare global {
  interface Window {
    __hypr_react: typeof React;
    __hypr_react_dom: typeof ReactDOM;
    __hypr_jsx_runtime: typeof jsxRuntime;
    __hypr_ui: Record<string, unknown>;
    __hypr_utils: typeof utils;
    __hypr_store: typeof main;
    __hypr_tabs: { useTabs: typeof useTabs };
  }
}

export function initExtensionGlobals() {
  window.__hypr_react = React;
  window.__hypr_react_dom = ReactDOM;
  window.__hypr_jsx_runtime = jsxRuntime;
  window.__hypr_utils = utils;

  window.__hypr_ui = {
    "components/ui/button": Button,
    "components/ui/button-group": ButtonGroup,
    "components/ui/card": Card,
    "components/ui/checkbox": Checkbox,
    "components/ui/popover": Popover,
  };

  window.__hypr_store = main;
  window.__hypr_tabs = { useTabs };
}
