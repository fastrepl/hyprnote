import type { Word } from "../store/tinybase/main";

type Segment = {
  text: string;
  speaker: string;
};

export const buildSegments = (
  {
    speakerFromChannel,
    words,
  }: {
    speakerFromChannel: (channel: number) => string;
    words: Word[];
  },
): Segment[] => {
  const segments: Segment[] = [];

  for (const word of words) {
    const speaker = speakerFromChannel(word.channel);
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && lastSegment.speaker === speaker) {
      lastSegment.text += ` ${word.text}`;
    } else {
      segments.push({ text: word.text, speaker });
    }
  }

  return segments;
};
