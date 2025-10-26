import { expect } from "vitest";

import type * as persisted from "../../../../../../../store/tinybase/persisted";
import type { MaybePartialWord } from "./segment";

interface CustomMatchers<R = unknown> {
  toHaveChannels: (...channels: number[]) => R;
  toHaveWordsInChannel: (channel: number, count: number) => R;
  toHaveWordsInOrder: (channel: number, texts: string[]) => R;
}

declare module "vitest" {
  interface Matchers<T = any> extends CustomMatchers<T> {}
}

expect.extend({
  toHaveChannels(received: Map<number, MaybePartialWord[]>, ...expectedChannels: number[]) {
    const { isNot } = this;
    const actualChannels = Array.from(received.keys()).sort();
    const sortedExpected = [...expectedChannels].sort();
    const pass = actualChannels.length === sortedExpected.length
      && actualChannels.every((ch, i) => ch === sortedExpected[i]);

    return {
      pass,
      message: () => `expected channels to${isNot ? " not" : ""} be [${sortedExpected}], but got [${actualChannels}]`,
      actual: actualChannels,
      expected: sortedExpected,
    };
  },
  toHaveWordsInChannel(received: Map<number, MaybePartialWord[]>, channel: number, expectedCount: number) {
    const { isNot } = this;
    const words = received.get(channel);
    const actualCount = words?.length ?? 0;
    const pass = actualCount === expectedCount;

    return {
      pass,
      message: () =>
        `expected channel ${channel} to${isNot ? " not" : ""} have ${expectedCount} word${
          expectedCount === 1 ? "" : "s"
        }, but got ${actualCount}`,
      actual: actualCount,
      expected: expectedCount,
    };
  },
  toHaveWordsInOrder(received: Map<number, MaybePartialWord[]>, channel: number, expectedTexts: string[]) {
    const { isNot } = this;
    const words = received.get(channel);
    const actualTexts = words?.map((w) => w.text) ?? [];
    const pass = actualTexts.length === expectedTexts.length
      && actualTexts.every((text, i) => text === expectedTexts[i]);

    return {
      pass,
      message: () =>
        `expected channel ${channel} words to${isNot ? " not" : ""} be [${expectedTexts.join(", ")}], but got [${
          actualTexts.join(", ")
        }]`,
      actual: actualTexts,
      expected: expectedTexts,
    };
  },
});

export function word(
  text: string,
  start_ms: number,
  end_ms: number,
  channel: number = 0,
): persisted.Word {
  return {
    text,
    start_ms,
    end_ms,
    channel,
    user_id: "test-user",
    transcript_id: "test-transcript",
    created_at: "2024-01-01",
  };
}
