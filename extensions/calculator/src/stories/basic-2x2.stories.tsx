import type { Meta, StoryObj } from "@storybook/react";
import BasicCalculator2x2 from "../widgets/basic/2x2";

const meta = {
  title: "Calculator/Basic/2x2",
  component: BasicCalculator2x2,
} satisfies Meta<typeof BasicCalculator2x2>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Main: Story = {
  parameters: {
    msw: {
      handlers: [],
    },
  },
  args: {
    onMaximize: () => {},
  },
};
