import type { Meta, StoryObj } from "@storybook/react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { mockIPC } from "@tauri-apps/api/mocks";

import { LiveSummaryResponse } from "@hypr/client/gen/types";
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
        http.post("http://localhost:1234/api/native/live_summary", () => {
          const res = {
            blocks: [
              {
                points: ["first point", "second point"],
              },
            ],
          } satisfies LiveSummaryResponse;

          return HttpResponse.json(res);
        }),
      ],
    },
  },
  decorators: [
    (Story) => {
      mockIPC((_cmd, _args) => {
        return {};
      });

      return (
        <QueryClientProvider client={queryClient}>
          {Story()}
        </QueryClientProvider>
      );
    },
  ],
  args: {
    onClose: () => {},
  },
};
