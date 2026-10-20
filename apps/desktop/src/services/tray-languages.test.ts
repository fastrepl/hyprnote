import { describe, expect, test } from "vitest";

import {
  buildTrayLanguageOptions,
  getTrayLanguageSelection,
} from "./tray-languages";

describe("buildTrayLanguageOptions", () => {
  test("lists the main language first and selected", () => {
    expect(buildTrayLanguageOptions("es", ["en"])).toEqual([
      { code: "es", label: "Spanish", selected: true },
      { code: "en", label: "English", selected: false },
    ]);
  });

  test("skips duplicates of the main language", () => {
    expect(
      buildTrayLanguageOptions("en", ["en", "fr"]).map(({ code }) => code),
    ).toEqual(["en", "fr"]);
  });

  test("returns a single option when no other language is configured", () => {
    expect(buildTrayLanguageOptions("en", [])).toHaveLength(1);
  });
});

describe("getTrayLanguageSelection", () => {
  test("makes the selection main and keeps the previous main language", () => {
    expect(getTrayLanguageSelection("en", "es", ["en", "fr"])).toEqual({
      ai_language: "en",
      spoken_languages: JSON.stringify(["es", "fr"]),
    });
  });

  test("switching back restores the original order", () => {
    const first = getTrayLanguageSelection("en", "es", ["en"]);
    const back = getTrayLanguageSelection(
      "es",
      first.ai_language,
      JSON.parse(first.spoken_languages),
    );

    expect(back).toEqual({
      ai_language: "es",
      spoken_languages: JSON.stringify(["en"]),
    });
  });
});
