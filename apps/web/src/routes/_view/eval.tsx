import { createFileRoute } from "@tanstack/react-router";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { useState } from "react";
import { Bar } from "react-chartjs-2";

import { cn } from "@hypr/utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export const Route = createFileRoute("/_view/eval")({
  component: Component,
});

interface ModelResult {
  model: string;
  rate: number;
}

interface EvalData {
  [task: string]: ModelResult[];
}

const mockEvalData: EvalData = {
  Summarization: [
    { model: "gpt-5-high", rate: 97.1 },
    { model: "o3-pro", rate: 96.7 },
    { model: "o3", rate: 96.2 },
    { model: "gpt-5.1-default", rate: 91.0 },
    { model: "o3-mini", rate: 87.6 },
    { model: "grok-4", rate: 86.2 },
    { model: "deepseek-r1-0528", rate: 84.3 },
    { model: "gemini-2.5-pro", rate: 79.0 },
    { model: "gpt-5-mini", rate: 71.0 },
    { model: "grok-4.1-fast", rate: 67.1 },
    { model: "gemini-2.5-flash", rate: 61.9 },
    { model: "qwen3-235b-a22b-thinking", rate: 60.0 },
    { model: "claude-4-opus", rate: 57.6 },
    { model: "deepseek-v3.1", rate: 50.0 },
    { model: "deepseek-v3.1-thinking", rate: 49.5 },
    { model: "gpt-4.1", rate: 44.8 },
    { model: "gpt-o3s-1200", rate: 39.5 },
    { model: "kimi-k2", rate: 35.2 },
    { model: "glm-4.5v", rate: 27.6 },
    { model: "claude-4-sonnet", rate: 24.3 },
    { model: "claude-4.5-sonnet", rate: 21.4 },
  ],
  "Question Answering": [
    { model: "o3-pro", rate: 98.2 },
    { model: "gpt-5-high", rate: 95.8 },
    { model: "o3", rate: 94.1 },
    { model: "gemini-2.5-pro", rate: 89.3 },
    { model: "gpt-5.1-default", rate: 88.7 },
    { model: "claude-4-opus", rate: 85.2 },
    { model: "deepseek-r1-0528", rate: 82.1 },
    { model: "grok-4", rate: 78.9 },
    { model: "o3-mini", rate: 75.4 },
    { model: "gpt-5-mini", rate: 72.3 },
    { model: "gemini-2.5-flash", rate: 68.7 },
    { model: "qwen3-235b-a22b-thinking", rate: 65.2 },
    { model: "grok-4.1-fast", rate: 61.8 },
    { model: "deepseek-v3.1", rate: 58.4 },
    { model: "claude-4-sonnet", rate: 54.9 },
  ],
  "Action Items": [
    { model: "gpt-5-high", rate: 94.5 },
    { model: "o3-pro", rate: 93.2 },
    { model: "claude-4-opus", rate: 91.8 },
    { model: "o3", rate: 89.4 },
    { model: "gpt-5.1-default", rate: 86.7 },
    { model: "gemini-2.5-pro", rate: 83.2 },
    { model: "deepseek-r1-0528", rate: 79.8 },
    { model: "grok-4", rate: 76.4 },
    { model: "o3-mini", rate: 72.1 },
    { model: "gpt-5-mini", rate: 68.9 },
    { model: "claude-4-sonnet", rate: 65.3 },
    { model: "gemini-2.5-flash", rate: 61.7 },
    { model: "qwen3-235b-a22b-thinking", rate: 57.2 },
  ],
  "Speaker Identification": [
    { model: "o3-pro", rate: 92.8 },
    { model: "gpt-5-high", rate: 91.3 },
    { model: "gemini-2.5-pro", rate: 88.6 },
    { model: "o3", rate: 85.9 },
    { model: "gpt-5.1-default", rate: 82.4 },
    { model: "claude-4-opus", rate: 78.7 },
    { model: "deepseek-r1-0528", rate: 74.2 },
    { model: "grok-4", rate: 70.8 },
    { model: "o3-mini", rate: 66.3 },
    { model: "gpt-5-mini", rate: 62.1 },
  ],
};

function generateRainbowColors(count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hue = (i / count) * 360;
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  return colors;
}

function Component() {
  const tasks = Object.keys(mockEvalData);
  const [selectedTask, setSelectedTask] = useState(tasks[0]);

  const taskData = mockEvalData[selectedTask] || [];
  const sortedData = [...taskData].sort((a, b) => b.rate - a.rate);

  const labels = sortedData.map((d) => d.model);
  const values = sortedData.map((d) => d.rate);
  const colors = generateRainbowColors(sortedData.length);

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderRadius: 4,
        barThickness: 24,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bar">) => {
            const value = context.parsed.y;
            return value !== null ? `${value.toFixed(1)}%` : "";
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#9ca3af",
          maxRotation: 90,
          minRotation: 45,
          font: {
            size: 10,
          },
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "#9ca3af",
          stepSize: 25,
          callback: (value: number | string) => `${value}`,
        },
        title: {
          display: true,
          text: "Success Rate (%)",
          color: "#9ca3af",
        },
      },
    },
  };

  return (
    <main className="flex-1 bg-neutral-900 min-h-screen">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-serif text-white mb-8 text-center">
          Model Evaluation Results
        </h1>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {tasks.map((task) => (
            <button
              key={task}
              onClick={() => setSelectedTask(task)}
              className={cn([
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                selectedTask === task
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700",
              ])}
            >
              {task}
            </button>
          ))}
        </div>

        <div className="h-[600px] w-full">
          <Bar data={data} options={options} />
        </div>
      </div>
    </main>
  );
}
