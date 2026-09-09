import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import * as icons from "@anlg/ui/components/icons";

const brandIconNames = new Set(["DiscordLogo", "GithubLogo", "XLogo"]);
const outlineIcons = Object.entries(icons).filter(
  ([name]) => !brandIconNames.has(name),
);

describe("outline icons", () => {
  it.each(outlineIcons)(
    "renders %s without filled shapes at every supported weight",
    (_, Icon) => {
      for (const weight of ["thin", "light", "regular", "bold"] as const) {
        const { container, unmount } = render(
          <Icon size={16} weight={weight} />,
        );
        const svg = container.querySelector("svg");

        expect(svg?.getAttribute("fill")).toBe("none");
        expect(svg?.querySelector('[fill]:not([fill="none"])')).toBeNull();
        expect(svg?.querySelector('[stroke="currentColor"]')).not.toBeNull();
        unmount();
      }
    },
  );

  it("ignores legacy fill props forwarded through a spread", () => {
    const { container } = render(
      <icons.Play {...{ size: 16, fill: "currentColor" }} />,
    );

    expect(container.querySelector("svg")?.getAttribute("fill")).toBe("none");
  });
});

describe("brand icons", () => {
  it.each([
    ["DiscordLogo", icons.DiscordLogo],
    ["GithubLogo", icons.GithubLogo],
    ["XLogo", icons.XLogo],
  ] as const)("renders %s as a filled brand logo", (_, Icon) => {
    const { container } = render(<Icon size={16} />);
    const svg = container.querySelector("svg");

    expect(svg?.getAttribute("fill")).toBe("currentColor");
    expect(svg?.querySelector("path")).not.toBeNull();
  });
});
