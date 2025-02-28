import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse, type HttpHandler } from "msw";
import { mockIPC } from "@tauri-apps/api/mocks";
import { ChatCompletion } from "openai/resources/chat/completions";
import type { LiveSummaryResponse } from "../types";
import LiveSummary2x2 from "../widgets/live/2x2";

const queryClient = new QueryClient();

const meta = {
  title: "Summary/Live/2x2",
  component: LiveSummary2x2,
} satisfies Meta<typeof LiveSummary2x2>;

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
