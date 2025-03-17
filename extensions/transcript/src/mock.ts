import type { SessionEvent, TimelineView, TimelineViewItem } from "@hypr/plugin-listener";
import { Channel } from "@tauri-apps/api/core";
import { mockIPC } from "@tauri-apps/api/mocks";

interface AugmentedTimelineViewItem extends TimelineViewItem {
  originalText?: string;
}

export interface AugmentedTimelineView extends TimelineView {
  items: AugmentedTimelineViewItem[];
}

interface AugmentedSessionEvent extends Omit<SessionEvent, "timeline"> {
  timeline?: AugmentedTimelineView;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockTranscriptIPC = () =>
  mockIPC((cmd, args) => {
    if (cmd == "plugin:listener|subscribe") {
      const channel: Channel<AugmentedSessionEvent> = (args as any).channel;

      // Send messages with realistic delays
      (async () => {
        let currentTime = 0;

        // John starts the meeting
        await sleep(500);
        currentTime += 0.5;
        channel.onmessage({
          type: "timelineView",
          timeline: {
            items: [
              {
                start: currentTime,
                end: currentTime + 3,
                speaker: "John",
                text: "팀원 여러분, 참석해 주셔서 감사합니다. 오늘은 새로운 전사 기능 요구사항에 대해 논의하겠습니다.",
                originalText:
                  "Hey team, thanks for joining. Today we'll discuss the new transcription feature requirements.",
              },
            ],
          },
        });

        // Sarah responds
        await sleep(3500);
        currentTime += 3.5;
        channel.onmessage({
          type: "timelineView",
          timeline: {
            items: [
              {
                start: currentTime,
                end: currentTime + 5,
                speaker: "Sarah",
                text:
                  "사용자 피드백을 기반으로 일부 모의 업을 진행했습니다. 주요 요구 사항은 실시간 업데이트와 명확한 발언자 식별입니다.",
                originalText:
                  "I've been working on some mockups based on user feedback. The main request is for real-time updates and clear speaker identification.",
              },
            ],
          },
        });

        // Mike adds technical context
        await sleep(5500);
        currentTime += 5.5;
        channel.onmessage({
          type: "timelineView",
          timeline: {
            items: [
              {
                start: currentTime,
                end: currentTime + 4,
                speaker: "Mike",
                text: "백엔드 기능과 잘 맞네요. 약 500ms 지연 시간으로 전사 내용을 스트리밍할 수 있습니다.",
                originalText:
                  "That aligns with our backend capabilities. We can stream the transcription with about 500ms latency.",
              },
            ],
          },
        });

        // John asks about timeline
        await sleep(4500);
        currentTime += 4.5;
        channel.onmessage({
          type: "timelineView",
          timeline: {
            items: [
              {
                start: currentTime,
                end: currentTime + 2,
                speaker: "John",
                text: "구현 일정은 어떻게 되나요?",
                originalText: "What's our timeline for implementing this?",
              },
            ],
          },
        });

        // Sarah provides estimate
        await sleep(3000);
        currentTime += 3;
        channel.onmessage({
          type: "timelineView",
          timeline: {
            items: [
              {
                start: currentTime,
                end: currentTime + 4,
                speaker: "Sarah",
                text: "UI 작업은 약 2주 정도 걸릴 것 같습니다. 대부분의 컴포넌트는 이미 준비되어 있습니다.",
                originalText: "The UI work should take about two weeks. We already have most of the components ready.",
              },
            ],
          },
        });

        // Mike confirms backend timeline
        await sleep(4500);
        currentTime += 4.5;
        channel.onmessage({
          type: "timelineView",
          timeline: {
            items: [
              {
                start: currentTime,
                end: currentTime + 3,
                speaker: "Mike",
                text: "백엔드 통합은 병행해서 진행할 수 있습니다. 2주 후면 테스트 준비가 완료될 것 같습니다.",
                originalText:
                  "Backend integration can be done in parallel. We should be ready for testing in two weeks.",
              },
            ],
          },
        });

        // Meeting wrap-up
        await sleep(3500);
        currentTime += 3.5;
        channel.onmessage({
          type: "timelineView",
          timeline: {
            items: [
              {
                start: currentTime,
                end: currentTime + 2,
                speaker: "John",
                text: "완벽합니다. 다음 주에 진행 상황을 확인하기 위해 다시 모이겠습니다. 모두 감사합니다!",
                originalText: "Perfect, let's reconvene next week for a progress check. Thanks everyone!",
              },
            ],
          },
        });

        // Send stopped event after a brief pause
        await sleep(2500);
        channel.onmessage({
          type: "stopped",
        });
      })();
    }

    return {};
  });
