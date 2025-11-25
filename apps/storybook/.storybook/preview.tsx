import type { Preview } from "@storybook/react";

import "../../../packages/tiptap/styles.css";
import "../../../packages/ui/src/styles/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
