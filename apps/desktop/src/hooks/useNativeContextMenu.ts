import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { type MouseEvent, useCallback } from "react";

export type MenuItemDef = {
  id: string;
  text: string;
  action: () => void;
  disabled?: boolean;
};

export function useNativeContextMenu(items: MenuItemDef[]) {
  const showMenu = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();

      const menuItems = await Promise.all(
        items.map((item) =>
          MenuItem.new({
            id: item.id,
            text: item.text,
            enabled: !item.disabled,
            action: item.action,
          }),
        ),
      );

      const menu = await Menu.new({ items: menuItems });
      await menu.popup();
    },
    [items],
  );

  return showMenu;
}
