import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";

import { useCustomSidebarEffect } from "./use-custom-sidebar";

import { useLeftSidebar } from "~/contexts/shell/leftsidebar";

test("visiting settings preserves the preference of an automatically hidden sidebar", () => {
  const { result, rerender } = renderHook(
    ({ active }) => {
      const sidebar = useLeftSidebar();
      useCustomSidebarEffect(active, sidebar);
      return sidebar;
    },
    { initialProps: { active: false } },
  );
  act(() => result.current.setAutoCollapsed(true));
  expect(result.current.expanded).toBe(false);
  rerender({ active: true });
  expect(result.current.expanded).toBe(true);
  rerender({ active: false });
  expect(result.current.expanded).toBe(false);
  act(() => result.current.setAutoCollapsed(false));
  expect(result.current.expanded).toBe(true);
  act(() => result.current.setExpanded(false));
  rerender({ active: true });
  expect(result.current.expanded).toBe(true);
  rerender({ active: false });
  expect(result.current.expanded).toBe(false);
});
