import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RelatedPastNotesFull from "../widgets/related/full";

const queryClient = new QueryClient();

const meta = {
  title: "Past Notes/Related/Full",
  component: RelatedPastNotesFull,
} satisfies Meta<typeof RelatedPastNotesFull>;

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
          <div style={{ height: "80vh" }}>{Story()}</div>
        </QueryClientProvider>
      );
    },
  ],
  args: {
    onMinimize: () => {},
  },
};
