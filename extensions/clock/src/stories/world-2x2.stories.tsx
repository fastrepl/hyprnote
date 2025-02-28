import type { Meta, StoryObj } from "@storybook/react";
import WorldClock2x2 from "../widgets/world/2x2";

const meta = {
  title: "Clock/World/2x2",
  component: WorldClock2x2,
} satisfies Meta<typeof WorldClock2x2>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Main: Story = {
  parameters: {
    msw: {
      handlers: [],
    },
  },
  args: {},
};
