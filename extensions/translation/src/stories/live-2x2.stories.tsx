import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { mockTranscriptIPC } from "../../mock";
import LiveTranslation2x2 from "../widgets/live/2x2";

const queryClient = new QueryClient();

const meta = {
  title: "Translation/Live/2x2",
  component: LiveTranslation2x2,
} satisfies Meta<typeof LiveTranslation2x2>;

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
