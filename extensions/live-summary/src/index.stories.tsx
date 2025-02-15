import type { Meta, StoryObj } from "@storybook/react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import component from "./index";

const queryClient = new QueryClient();

const meta = {
  title: "Extensions/Live Summary",
  component,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Main: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("http://localhost:3000/api/users", () => {
          return HttpResponse.json({ id: 1, name: "John Doe" });
        }),
      ],
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>{Story()}</QueryClientProvider>
    ),
  ],
  args: {
    onClose: () => {},
  },
};
