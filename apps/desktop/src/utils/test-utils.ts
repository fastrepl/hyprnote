import { expect } from "vitest";

import type * as main from "../store/tinybase/main";
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
  overrides: Partial<main.Word & { isFinal: boolean }> = {},
): main.Word & { isFinal: boolean } {
  return {
    text: overrides.text ?? "word",
    start_ms: overrides.start_ms ?? 0,
    end_ms: overrides.end_ms ?? 100,
    channel: overrides.channel ?? 0,
    isFinal: overrides.isFinal ?? true,
    user_id: overrides.user_id ?? "test-user",
    transcript_id: overrides.transcript_id ?? "test-transcript",
    created_at: overrides.created_at ?? "2024-01-01",
  };
}
