import type { Meta, StoryObj } from "@storybook/react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { mockIPC } from "@tauri-apps/api/mocks";

import { createConfig, createClient } from "@hypr/client";

import type { LiveSummaryResponse } from "./types";
import extension from "./index";

const queryClient = new QueryClient();

const client = createClient(
  createConfig({
    fetch,
    auth: () => "123",
    baseUrl: "http://localhost:1234",
  }),
);

const meta = {
  title: "Extensions/Live Summary",
  component: extension.modal,
} satisfies Meta<typeof extension.modal>;

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
                points: ["first point", "second point", "third point"],
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
    client,
    onClose: () => {},
  },
};
