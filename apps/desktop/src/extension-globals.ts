import * as React from "react";
import * as ReactDOM from "react-dom";
import * as jsxRuntime from "react/jsx-runtime";

import * as Button from "@hypr/ui/components/ui/button";
import * as Card from "@hypr/ui/components/ui/card";
import * as utils from "@hypr/utils";

declare global {
  interface Window {
    __hypr_react: typeof React;
    __hypr_react_dom: typeof ReactDOM;
    __hypr_jsx_runtime: typeof jsxRuntime;
    __hypr_ui: Record<string, unknown>;
    __hypr_utils: typeof utils;
  }
}

export function initExtensionGlobals() {
  window.__hypr_react = React;
  window.__hypr_react_dom = ReactDOM;
  window.__hypr_jsx_runtime = jsxRuntime;
  window.__hypr_utils = utils;

  window.__hypr_ui = {
    "components/ui/button": Button,
    "components/ui/card": Card,
  };
}
