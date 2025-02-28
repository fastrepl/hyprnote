import type { Meta, StoryObj } from "@storybook/react";
import ChromeDino2x1 from "../widgets/chrome/2x1";

const meta = {
  title: "Dino Game/Chrome/2x1",
  component: ChromeDino2x1,
} satisfies Meta<typeof ChromeDino2x1>;

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
