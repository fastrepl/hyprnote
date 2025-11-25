import { describe, expect, test, vi } from "vitest";

import { fixSpacingForWords } from "./utils";

describe("fixSpacingForWords", () => {
  const testCases = [
    {
      transcript: "Hello",
      input: ["Hello"],
      output: [" Hello"],
    },
    {
      transcript: "Yes. Because we",
      input: ["Yes.", "Because", "we"],
      output: [" Yes.", " Because", " we"],
    },
    {
      transcript: "shouldn't",
      input: ["shouldn", "'t"],
      output: [" shouldn", "'t"],
    },
    {
      transcript: "Yes. Because we shouldn't be false.",
      input: ["Yes.", "Because", "we", "shouldn", "'t", "be", "false."],
      output: [" Yes.", " Because", " we", " shouldn", "'t", " be", " false."],
    },
  ];

  test.each(testCases)(
    "transcript: $transcript",
    ({ transcript, input, output }) => {
      expect(output.join("")).toEqual(` ${transcript}`);

      const actual = fixSpacingForWords(input, transcript);
      expect(actual).toEqual(output);
    },
  );

  describe("Issue #5: String Matching Inefficiency and Missing Word Logging", () => {
    test("handles words not found in transcript gracefully", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const input = ["Hello", "missing", "world"];
      const transcript = "Hello world";

      const result = fixSpacingForWords(input, transcript);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(" Hello");
      expect(result[1]).toBe("missing");
      expect(result[2]).toBe(" world");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Word not found in transcript"),
        expect.objectContaining({
          word: "missing",
          transcript: "Hello world",
        }),
      );

      consoleWarnSpy.mockRestore();
    });

    test("handles empty transcript", () => {
      const input = ["Hello"];
      const transcript = "";

      const result = fixSpacingForWords(input, transcript);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe("Hello");
    });

    test("handles empty words array", () => {
      const input: string[] = [];
      const transcript = "Hello world";

      const result = fixSpacingForWords(input, transcript);

      expect(result).toHaveLength(0);
    });

    test("performance: handles large word arrays efficiently", () => {
      const largeInput = Array(1000).fill("word");
      const largeTranscript = largeInput.join(" ");

      const startTime = performance.now();
      const result = fixSpacingForWords(largeInput, largeTranscript);
      const endTime = performance.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
