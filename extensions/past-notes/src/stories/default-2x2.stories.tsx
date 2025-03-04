import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PastNotes2x2 from "../widgets/default/2x2";

const queryClient = new QueryClient();

const meta = {
  title: "Past Notes/Default/2x2",
  component: PastNotes2x2,
} satisfies Meta<typeof PastNotes2x2>;

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
