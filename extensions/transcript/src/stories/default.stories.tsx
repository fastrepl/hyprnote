import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@hypr/ui/components/ui/button";
import { WidgetTwoByTwoWrapper as Wrapper } from "@hypr/ui/components/ui/widgets";
import { Maximize2Icon } from "lucide-react";
import { Active as ActiveComponent, Inactive } from "../components";

const meta = {
  title: "Transcript/States",
  decorators: [
    (Story: any) => (
      <div style={{ padding: "2rem" }}>
        {Story()}
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  render: () => (
    <ActiveComponent
      sessionId="mock-session-id"
      hasTranscript={true}
      isInactive={false}
      sizeToggleButton={<SizeToggleButton />}
      WrapperComponent={Wrapper}
      onOpenTranscriptSettings={() => {}}
      onOpenSession={() => {}}
      isLive={true}
      transcriptProps={{
        isLive: true,
        isLoading: false,
        timeline: {
          items: [
            { text: "Hey team, thanks for joining. Today we'll discuss the new transcription feature requirements." },
            {
              text:
                "I've been working on some mockups based on user feedback. The main request is for real-time updates and clear speaker identification.",
            },
            {
              text:
                "That aligns with our backend capabilities. We can stream the transcription with about 500ms latency.",
            },
            { text: "What's our timeline for implementing this?" },
          ],
        },
      }}
    />
  ),
};

// Loading state
export const Loading: Story = {
  render: () => (
    <ActiveComponent
      sessionId="mock-session-id"
      hasTranscript={true}
      isInactive={false}
      sizeToggleButton={<SizeToggleButton />}
      WrapperComponent={Wrapper}
      onOpenTranscriptSettings={() => {}}
      onOpenSession={() => {}}
      isLive={false}
      transcriptProps={{
        isLive: false,
        isLoading: true,
        timeline: { items: [] },
      }}
    />
  ),
};

export const NoTranscript: Story = {
  render: () => (
    <Wrapper className="relative w-full h-full">
      <Inactive
        sessionId="mock-session-id"
        showEmptyMessage={true}
        isEnhanced={true}
      />
    </Wrapper>
  ),
};

export const NotActive: Story = {
  render: () => (
    <Wrapper className="relative w-full h-full">
      <Inactive
        sessionId="mock-session-id"
        showEmptyMessage={true}
        isEnhanced={false}
      />
    </Wrapper>
  ),
};

export const NoSession: Story = {
  render: () => (
    <Wrapper className="relative w-full h-full">
      <Inactive
        sessionId={null}
        showEmptyMessage={false}
        isEnhanced={false}
      />
    </Wrapper>
  ),
};

const SizeToggleButton = () => (
  <Button
    key="maximize"
    variant="ghost"
    size="icon"
    className="p-0"
  >
    <Maximize2Icon size={16} className="text-neutral-900" />
  </Button>
);
