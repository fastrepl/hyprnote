import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RelatedPastNotes2x2 from "../widgets/related/2x2";

const queryClient = new QueryClient();

const meta = {
  title: "Past Notes/Related/2x2",
  component: RelatedPastNotes2x2,
} satisfies Meta<typeof RelatedPastNotes2x2>;

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
