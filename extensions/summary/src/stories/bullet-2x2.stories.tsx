import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockIPC } from "@tauri-apps/api/mocks";
import { http, HttpResponse, type HttpHandler } from "msw";

import type { ChatCompletion } from "openai/resources/chat/completions";
import type { LiveSummaryResponse } from "../types";
import BulletStyledSummary2x2 from "../widgets/bullet/2x2";

const queryClient = new QueryClient();

const meta = {
  title: "Summary/Bullet/2x2",
  component: BulletStyledSummary2x2,
} satisfies Meta<typeof BulletStyledSummary2x2>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Main: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("http://localhost:1234/v1/chat/completions", async () => {
          const data = {
            points: [
              "Hyprnote is a macOS notepad for meetings that uses AI to listen to the environment and transform raw notes into comprehensive summaries.",
              "It works seamlessly for both in-person and virtual meetings, ensuring you capture key insights effortlessly.",
              "Download it at hyprnote.com to enhance your meeting productivity.",
            ],
          } satisfies LiveSummaryResponse;
          const res: ChatCompletion = {
            id: "123",
            object: "chat.completion",
            created: 123,
            model: "gpt-4o-mini",
            choices: [
              {
                message: {
                  content: JSON.stringify(data),
                  role: "assistant",
                  refusal: null,
                },
                finish_reason: "stop",
                index: 0,
                logprobs: null,
              },
            ],
          };

          return HttpResponse.json(res);
        }),
      ] satisfies HttpHandler[],
    },
  },
  decorators: [
    (Story: any) => {
      mockIPC((cmd, args: any) => {
        if (cmd == "plugin:template|render") {
          if (args.name.includes("system")) {
            return "You are a helpful assistant.";
          }

          if (args.name.includes("user")) {
            return "generate a random json object. Each contains a one fun sentence.";
          }
        }

        if (cmd == "plugin:connector|get_api_base") {
          return "http://localhost:1234/v1";
        }

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
    onMaximize: () => {},
  },
};
