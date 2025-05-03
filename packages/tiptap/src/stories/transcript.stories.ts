import type { Meta, StoryObj } from "@storybook/react";

import TranscriptEditor from "../transcript";

const meta = {
  title: "Tiptap/Transcript",
  component: TranscriptEditor,
} satisfies Meta<typeof TranscriptEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    initialContent: {
      type: "doc",
      content: [
        {
          type: "speaker",
          content: [
            {
              type: "sentence",
              content: [{ type: "word", attrs: { text: "Hello, world!" } }],
            },
            {
              type: "sentence",
              content: [{ type: "word", attrs: { text: "Hello, world!" } }],
            },
          ],
        },
      ],
    },
  },
};
