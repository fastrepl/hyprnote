import { describe, expect, test } from "vitest";

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

  test("handles Korean transcript without spaces", () => {
    const transcript = "이거근데딱보니까양이너무부족해";
    const input = ["이거", "근데", "딱보니까", "양이", "너무", "부족해"];
    const output = [" 이거", " 근데", " 딱보니까", " 양이", " 너무", " 부족해"];

    const actual = fixSpacingForWords(input, transcript);
    expect(actual).toEqual(output);
  });

  test("handles Korean transcript with spaces normally", () => {
    const transcript = "안녕 하세요 반갑습니다";
    const input = ["안녕", "하세요", "반갑습니다"];
    const output = [" 안녕", " 하세요", " 반갑습니다"];

    const actual = fixSpacingForWords(input, transcript);
    expect(actual).toEqual(output);
  });
});
