import type { Meta, StoryObj } from "@storybook/react";

import Editor from "../editor";

const meta = {
  title: "Tiptap/Editor",
  component: Editor,
} satisfies Meta<typeof Editor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    initialContent: "Hello, world!",
    handleChange: () => {},
  },
};
