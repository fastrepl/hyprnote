import { tool } from "@langchain/core/tools";
import { z } from "zod";

const QUICKCHART_BASE_URL = "https://quickchart.io/chart";

export const chartTool = tool(
  async ({ config, width, height, backgroundColor }: {
    config: string;
    width?: number;
    height?: number;
    backgroundColor?: string;
  }) => {
    const params = new URLSearchParams();
    params.set("c", config);

    if (width) {
      params.set("w", width.toString());
    }
    if (height) {
      params.set("h", height.toString());
    }
    if (backgroundColor) {
      params.set("bkg", backgroundColor);
    }

    const chartUrl = `${QUICKCHART_BASE_URL}?${params.toString()}`;

    return `![Chart](${chartUrl})`;
  },
  {
    name: "chart",
    description:
      "Generate a chart image using QuickChart.io. Returns a markdown image that will be rendered in Slack. The config parameter should be a Chart.js configuration object as a JSON string. Supports bar, line, pie, doughnut, radar, scatter, and other Chart.js chart types.",
    schema: z.object({
      config: z
        .string()
        .describe(
          'Chart.js configuration object as a JSON string. Example: {"type":"bar","data":{"labels":["Q1","Q2","Q3","Q4"],"datasets":[{"label":"Sales","data":[10,20,30,40]}]}}',
        ),
      width: z
        .number()
        .optional()
        .describe("Chart width in pixels (default: 500)"),
      height: z
        .number()
        .optional()
        .describe("Chart height in pixels (default: 300)"),
      backgroundColor: z
        .string()
        .optional()
        .describe("Background color (default: transparent). Use 'white' for better visibility in Slack."),
    }),
  },
);
