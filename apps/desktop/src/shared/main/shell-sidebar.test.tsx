import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockCurrentTab: {
  type: "settings" | "empty" | "onboarding" | "calendar" | "automations";
} | null = { type: "empty" };
const mockLeftSidebar = {
  expanded: false,
};

vi.mock("~/contexts/shell", () => ({
  useShell: () => ({
    leftsidebar: mockLeftSidebar,
  }),
}));

vi.mock("~/store/zustand/tabs", () => ({
  useTabs: (
    selector: (state: { currentTab: typeof mockCurrentTab }) => unknown,
  ) => selector({ currentTab: mockCurrentTab }),
}));

vi.mock("~/sidebar", () => ({
  LeftSidebar: () => <div data-testid="left-sidebar" />,
}));

import { ClassicMainSidebar } from "~/main/shell-sidebar";

describe("ClassicMainSidebar", () => {
  beforeEach(() => {
    cleanup();
    mockCurrentTab = { type: "empty" };
    mockLeftSidebar.expanded = false;
  });

  it("renders the default timeline sidebar when expanded", () => {
    mockLeftSidebar.expanded = true;

    render(<ClassicMainSidebar />);

    expect(screen.getByTestId("left-sidebar")).toBeTruthy();
  });

  it("unmounts the sidebar while collapsed", () => {
    mockLeftSidebar.expanded = false;

    render(<ClassicMainSidebar />);

    expect(screen.queryByTestId("left-sidebar")).toBeNull();
  });
});
