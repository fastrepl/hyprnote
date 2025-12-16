import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import Editor from "../../../packages/tiptap/src/editor";

const meta = {
  title: "Tiptap/Editor",
  component: Editor,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Editor>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultMentionConfig = {
  items: async () => [],
  render: () => {
    const element = document.createElement("div");
    return { element, destroy: () => {} };
  },
};

export const Default: Story = {
  args: {
    mentionConfig: defaultMentionConfig,
    editable: true,
  },
};

export const WithInitialContent: Story = {
  args: {
    mentionConfig: defaultMentionConfig,
    editable: true,
    initialContent: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hello from Tiptap editor!",
            },
          ],
        },
      ],
    },
  },
};

export const ReadOnly: Story = {
  args: {
    mentionConfig: defaultMentionConfig,
    editable: false,
    initialContent: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This editor is read-only.",
            },
          ],
        },
      ],
    },
  },
};

function EditorWithState() {
  const [content, setContent] = useState({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Edit me and see the content update!",
          },
        ],
      },
    ],
  });

  return (
    <div>
      <Editor
        mentionConfig={defaultMentionConfig}
        handleChange={setContent}
        initialContent={content}
      />
      <pre style={{ marginTop: "20px", fontSize: "12px" }}>
        {JSON.stringify(content, null, 2)}
      </pre>
    </div>
  );
}

export const WithStateManagement: Story = {
  render: () => <EditorWithState />,
};
