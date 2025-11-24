import type { Meta, StoryObj } from "@storybook/react";

import { Input } from "../../../packages/ui/src/components/ui/input";

const meta = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

export const WithValue: Story = {
  args: {
    value: "Hello World",
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Disabled input",
    disabled: true,
  },
};

export const Email: Story = {
  args: {
    type: "email",
    placeholder: "email@example.com",
  },
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Enter password",
  },
};
