import type { Meta, StoryObj } from "@storybook/react";

import Config from "../config/api-key-form";
import MockProvider from "../widgets/default/mock";

const meta = {
  title: "Twenty/Config",
  component: Config,
} satisfies Meta<typeof Config>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Main: Story = {
  parameters: {
    msw: {
      handlers: [],
    },
  },
  decorators: [
    (Story: any) => {
      return (
        <MockProvider>
          {Story()}
        </MockProvider>
      );
    },
  ],
};
