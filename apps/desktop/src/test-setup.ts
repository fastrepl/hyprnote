import { vi } from "vitest";

vi.mock("@hypr/plugin-analytics", () => ({
  commands: {
    event: vi.fn().mockResolvedValue({ status: "ok", data: null }),
    setProperties: vi.fn().mockResolvedValue({ status: "ok", data: null }),
    setDisabled: vi.fn().mockResolvedValue({ status: "ok", data: null }),
    isDisabled: vi.fn().mockResolvedValue({ status: "ok", data: false }),
  },
}));
