import { Icon, Row } from "@expo/ui";
import { DropdownMenu, DropdownMenuItem } from "@expo/ui/jetpack-compose";
import { defaultMinSize } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";

import { ControlSize } from "@/constants/theme";

import { Text } from "./fields";
import { ProviderIcon } from "./provider-icon";
import { useColors } from "./theme-provider";

export function ProviderPicker({
  providers,
  selectedValue,
  enabled,
  onValueChange,
}: {
  providers: readonly { id: string; name: string }[];
  selectedValue: string;
  enabled: boolean;
  onValueChange: (provider: string) => void;
}) {
  const Colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const selected = providers.find(({ id }) => id === selectedValue);
  return (
    <DropdownMenu
      expanded={expanded}
      onDismissRequest={() => setExpanded(false)}
      color={Colors.surface}
    >
      <DropdownMenu.Trigger>
        <Row
          onPress={enabled ? () => setExpanded(true) : undefined}
          modifiers={[defaultMinSize({ minHeight: ControlSize.default })]}
          spacing={8}
          alignment="center"
          testID="active-provider"
        >
          {selected && <ProviderIcon provider={selected.id} />}
          <Text>{selected?.name ?? "Select provider"}</Text>
          <Icon
            name={Icon.select({
              ios: "chevron.down",
              android: import("@expo/material-symbols/keyboard_arrow_down.xml"),
            })}
            size={16}
            color={Colors.muted}
          />
        </Row>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {providers.map((provider) => (
          <DropdownMenuItem
            key={provider.id}
            enabled={enabled}
            onClick={() => {
              setExpanded(false);
              onValueChange(provider.id);
            }}
          >
            <DropdownMenuItem.LeadingIcon>
              <ProviderIcon provider={provider.id} />
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <Text>{provider.name}</Text>
            </DropdownMenuItem.Text>
            {selectedValue === provider.id && (
              <DropdownMenuItem.TrailingIcon>
                <Icon
                  name={Icon.select({
                    ios: "checkmark",
                    android: import("@expo/material-symbols/check.xml"),
                  })}
                  size={18}
                  color={Colors.ink}
                />
              </DropdownMenuItem.TrailingIcon>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}
