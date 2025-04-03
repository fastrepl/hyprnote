import type { Meta, StoryObj } from "@storybook/react";

import Twenty2x2 from "../widgets/default/2x2";
import MockProvider from "../widgets/default/mock";

const meta = {
  title: "Twenty/Default/2x2",
  component: Twenty2x2,
} satisfies Meta<typeof Twenty2x2>;

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
