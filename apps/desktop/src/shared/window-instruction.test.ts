import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  windowSaveFrame: vi.fn(),
  windowEmitNavigate: vi.fn(),
  windowSetFrameAnimated: vi.fn(),
  windowRestoreFrameAnimated: vi.fn(),
}));

vi.mock("../../../../plugins/windows/js/bindings.gen", () => ({
  commands: mocks,
  events: {},
}));

import {
  dismissInstruction,
  openUrlWithInstruction,
} from "@anlg/plugin-windows";

describe("openUrlWithInstruction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("opens the browser without resizing when the original frame cannot be saved", async () => {
    mocks.windowSaveFrame.mockResolvedValue({
      status: "error",
      error: "restore geometry unavailable",
    });
    const openUrl = vi.fn().mockResolvedValue({ status: "ok" });

    await expect(
      openUrlWithInstruction("https://example.com", "billing", openUrl),
    ).resolves.toBeUndefined();

    expect(mocks.windowEmitNavigate).not.toHaveBeenCalled();
    expect(mocks.windowSetFrameAnimated).not.toHaveBeenCalled();
    expect(openUrl).toHaveBeenCalledWith("https://example.com");

    openUrl.mockResolvedValue({
      status: "error",
      error: "browser unavailable",
    });
    await expect(
      openUrlWithInstruction("https://example.com", "billing", openUrl),
    ).rejects.toThrow("browser unavailable");
  });

  it("completes dismissal even if restoring the original frame fails", async () => {
    mocks.windowEmitNavigate.mockResolvedValue({ status: "ok", data: null });
    mocks.windowRestoreFrameAnimated.mockResolvedValue({
      status: "error",
      error: "window manager timed out",
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(dismissInstruction()).resolves.toBeUndefined();
    expect(mocks.windowEmitNavigate).toHaveBeenCalledWith(
      { type: "main" },
      { path: "/app", search: null },
    );
    expect(warn).toHaveBeenCalledWith(
      "Failed to restore instruction window frame:",
      "window manager timed out",
    );
    warn.mockRestore();
  });
});
