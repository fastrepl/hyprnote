import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockTranscriptIPC } from "./mocks";
import LiveTranscriptWithCheckpointFull from "../widgets/checkpoint/full";

const queryClient = new QueryClient();

const meta = {
  title: "Transcript/Checkpoint/Full",
  component: LiveTranscriptWithCheckpointFull,
} satisfies Meta<typeof LiveTranscriptWithCheckpointFull>;

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
          <div style={{ height: "80vh" }}>{Story()}</div>
        </QueryClientProvider>
      );
    },
  ],
  args: {
    onMinimize: () => {},
  },
};
