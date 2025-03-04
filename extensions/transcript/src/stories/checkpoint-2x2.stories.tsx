import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockTranscriptIPC } from "./mocks";
import LiveTranscriptWithCheckpoint2x2 from "../widgets/checkpoint/2x2";

const queryClient = new QueryClient();

const meta = {
  title: "Transcript/Checkpoint/2x2",
  component: LiveTranscriptWithCheckpoint2x2,
} satisfies Meta<typeof LiveTranscriptWithCheckpoint2x2>;

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
      mockTranscriptIPC();

      return (
        <QueryClientProvider client={queryClient}>
          {Story()}
        </QueryClientProvider>
      );
    },
  ],
  args: {
    onMaximize: () => {},
  },
};
