export type BatchWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number | null;
  punctuated_word?: string | null;
};

export type BatchAlternatives = {
  transcript: string;
  confidence: number;
  words: BatchWord[];
};

export type BatchChannel = {
  alternatives: BatchAlternatives[];
};

export type BatchResults = {
  channels: BatchChannel[];
};

export type BatchResponse = {
  metadata: unknown;
  results: BatchResults;
};

export type BatchProvider = "deepgram" | "assemblyai" | "soniox";

export type BatchParams = {
  languages?: string[];
  keywords?: string[];
  model?: string;
};
