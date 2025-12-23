import { listen } from "@tauri-apps/api/event";
import { Menu } from "@tauri-apps/api/menu";
import { type MouseEvent, useCallback, useEffect, useRef } from "react";

export type MenuItemDef = {
  id: string;
  text: string;
  action: () => void;
  disabled?: boolean;
};

export function useNativeContextMenu(items: MenuItemDef[]) {
  const actionsRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    actionsRef.current.clear();
    items.forEach((item) => actionsRef.current.set(item.id, item.action));
  }, [items]);

  useEffect(() => {
    const unlisten = listen<string>("menu-event", (event) => {
      const action = actionsRef.current.get(event.payload);
      action?.();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const showMenu = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      const menu = await Menu.new({
        items: items.map((item) => ({
          id: item.id,
          text: item.text,
          enabled: !item.disabled,
        })),
      });
      await menu.popup();
    },
    [items],
  );

  return showMenu;
}
