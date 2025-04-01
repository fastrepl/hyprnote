import type { Meta, StoryObj } from "@storybook/react";

import LiveTranscriptFull from "../widgets/default/full";
import MockProvider from "../widgets/default/mock";

const meta = {
  title: "Transcript/Default/Full",
  component: LiveTranscriptFull,
} satisfies Meta<typeof LiveTranscriptFull>;

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
          <div style={{ height: "80vh" }}>{Story()}</div>
        </MockProvider>
      );
    },
  ],
  args: {
    onMinimize: () => {},
  },
};
