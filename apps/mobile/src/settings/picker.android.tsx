import { Icon, Picker as NativePicker, Row, Text } from "@expo/ui";
import { DropdownMenuItem, DropdownMenu } from "@expo/ui/jetpack-compose";
import {
  defaultMinSize,
  testID as testIDModifier,
} from "@expo/ui/jetpack-compose/modifiers";
import { Children, isValidElement, useState, type ReactNode } from "react";

import { ControlSize, Spacing, Typography } from "@/constants/theme";

import { useColors } from "./theme-provider";

function SettingsPicker<T extends string | number>({
  selectedValue,
  onValueChange,
  enabled = true,
  children,
  testID,
}: {
  selectedValue: T;
  onValueChange: (value: T) => void;
  enabled?: boolean;
  children?: ReactNode;
  testID?: string;
}) {
  const Colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children).flatMap((child) =>
    isValidElement<{ value: T; label: string }>(child) &&
    child.type === NativePicker.Item
      ? [child.props]
      : [],
  );
  const textStyle = {
    ...Typography.body,
    color: enabled ? Colors.ink : Colors.muted,
  };
  return (
    <DropdownMenu
      expanded={expanded}
      onDismissRequest={() => setExpanded(false)}
      color={Colors.surface}
    >
      <DropdownMenu.Trigger>
        <Row
          onPress={enabled ? () => setExpanded(true) : undefined}
          alignment="center"
          spacing={Spacing.sm}
          modifiers={[
            defaultMinSize({ minHeight: ControlSize.default }),
            ...(testID ? [testIDModifier(testID)] : []),
          ]}
        >
          <Text textStyle={textStyle}>
            {items.find((item) => item.value === selectedValue)?.label}
          </Text>
          <Icon
            name={Icon.select({
              ios: "chevron.down",
              android: import("@expo/material-symbols/keyboard_arrow_down.xml"),
            })}
            color={Colors.muted}
            size={16}
          />
        </Row>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {items.map((item) => (
          <DropdownMenuItem
            key={String(item.value)}
            enabled={enabled}
            onClick={() => {
              onValueChange(item.value);
              setExpanded(false);
            }}
          >
            <DropdownMenuItem.Text>
              <Text textStyle={textStyle}>{item.label}</Text>
            </DropdownMenuItem.Text>
            {item.value === selectedValue && (
              <DropdownMenuItem.TrailingIcon>
                <Icon
                  name={Icon.select({
                    ios: "checkmark",
                    android: import("@expo/material-symbols/check.xml"),
                  })}
                  color={Colors.ink}
                  size={18}
                />
              </DropdownMenuItem.TrailingIcon>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}

export const Picker = Object.assign(SettingsPicker, {
  Item: NativePicker.Item,
});
