export type Word = {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number | null;
  punctuated_word: string | null;
  language: string | null;
};

export type Segment = {
  speaker: number | null;
  words: Word[];
  startTime: number;
  endTime: number;
};
