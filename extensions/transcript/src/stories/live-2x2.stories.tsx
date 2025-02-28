import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockTranscriptIPC } from "./mocks";
import LiveTranscript2x2 from "../widgets/live/2x2";

const queryClient = new QueryClient();

const meta = {
  title: "Transcript/Live/2x2",
  component: LiveTranscript2x2,
} satisfies Meta<typeof LiveTranscript2x2>;

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
