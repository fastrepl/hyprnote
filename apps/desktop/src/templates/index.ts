import ENHANCE_SYSTEM_TEMPLATE_VALUE from "./enhance-system.jinja?raw";
import ENHANCE_USER_TEMPLATE_VALUE from "./enhance-user.jinja?raw";

export const ENHANCE_SYSTEM_TEMPLATE_KEY = "enhance-system";
export const ENHANCE_USER_TEMPLATE_KEY = "enhance-user";

import { commands as templateCommands } from "@hypr/plugin-template";

export const registerTemplates = () => {
  return Promise.all([
    templateCommands.registerTemplate(
      ENHANCE_SYSTEM_TEMPLATE_KEY,
      ENHANCE_SYSTEM_TEMPLATE_VALUE,
    ),
    templateCommands.registerTemplate(
      ENHANCE_USER_TEMPLATE_KEY,
      ENHANCE_USER_TEMPLATE_VALUE,
    ),
  ]);
};
