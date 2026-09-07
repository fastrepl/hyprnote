import {
  Column,
  Row,
  Text as NativeText,
  TextInput as NativeTextInput,
  type Button as NativeButton,
  type ListItem as NativeListItem,
  type Switch as NativeSwitch,
} from "@expo/ui";
import {
  Button as ComposeButton,
  OutlinedButton,
  Switch as ComposeSwitch,
  TextButton,
} from "@expo/ui/jetpack-compose";
import {
  fillMaxWidth,
  defaultMinSize,
  testID as testIDModifier,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";

import { ControlSize, Spacing, Typography } from "@/constants/theme";

import { useColors } from "./theme-provider";

export { Picker } from "./picker";

const FooterContext = createContext(false);

export function FieldFooter({ children }: { children?: ReactNode }) {
  return <FooterContext.Provider value>{children}</FooterContext.Provider>;
}

export function Text({
  textStyle,
  ...props
}: ComponentProps<typeof NativeText>) {
  const Colors = useColors();
  const footer = useContext(FooterContext);
  return (
    <NativeText
      {...props}
      textStyle={{
        ...(footer ? Typography.caption : Typography.body),
        color: footer ? Colors.muted : Colors.ink,
        ...textStyle,
      }}
    />
  );
}

export function TextInput({
  textStyle,
  ...props
}: ComponentProps<typeof NativeTextInput>) {
  const Colors = useColors();
  return (
    <NativeTextInput
      cursorColor={Colors.ink}
      selectionColor={Colors.accentSurface}
      selectionHandleColor={Colors.ink}
      placeholderTextColor={Colors.muted}
      {...props}
      textStyle={{ ...Typography.body, color: Colors.ink, ...textStyle }}
    />
  );
}

export function Button({
  label,
  children,
  variant = "filled",
  onPress,
  disabled,
  testID,
}: ComponentProps<typeof NativeButton>) {
  const Colors = useColors();
  const Component =
    variant === "text"
      ? TextButton
      : variant === "outlined"
        ? OutlinedButton
        : ComposeButton;
  const foreground =
    variant === "filled" ? Colors.primaryForeground : Colors.ink;
  return (
    <Component
      onClick={onPress}
      enabled={!disabled}
      colors={{
        containerColor: variant === "filled" ? Colors.primary : "transparent",
        contentColor: foreground,
        disabledContainerColor: Colors.mutedSurface,
        disabledContentColor: Colors.muted,
      }}
      modifiers={[
        defaultMinSize({ minHeight: ControlSize.default }),
        ...(testID ? [testIDModifier(testID)] : []),
      ]}
    >
      {children ?? (
        <Text
          textStyle={{
            ...Typography.label,
            color: disabled ? Colors.muted : foreground,
          }}
        >
          {label}
        </Text>
      )}
    </Component>
  );
}

export function Switch({
  value,
  onValueChange,
  label,
  disabled,
  testID,
}: ComponentProps<typeof NativeSwitch>) {
  const Colors = useColors();
  return (
    <Row alignment="center" spacing={Spacing.sm} modifiers={[fillMaxWidth()]}>
      {label != null && <Text modifiers={[weight(1)]}>{label}</Text>}
      <ComposeSwitch
        value={value}
        onCheckedChange={onValueChange}
        enabled={!disabled}
        modifiers={testID ? [testIDModifier(testID)] : undefined}
        colors={{
          checkedTrackColor: Colors.ink,
          checkedThumbColor: Colors.background,
          checkedBorderColor: Colors.ink,
          uncheckedTrackColor: Colors.mutedSurface,
          uncheckedThumbColor: Colors.muted,
          uncheckedBorderColor: Colors.border,
          disabledCheckedTrackColor: Colors.mutedSurface,
          disabledCheckedThumbColor: Colors.muted,
          disabledCheckedBorderColor: Colors.border,
          disabledUncheckedTrackColor: Colors.mutedSurface,
          disabledUncheckedThumbColor: Colors.muted,
          disabledUncheckedBorderColor: Colors.border,
        }}
      />
    </Row>
  );
}

export function ListItem({
  children,
  leading,
  trailing,
  supportingText,
  onPress,
}: ComponentProps<typeof NativeListItem>) {
  const Colors = useColors();
  return (
    <Row
      alignment="center"
      spacing={Spacing.compact}
      onPress={onPress}
      modifiers={[
        fillMaxWidth(),
        defaultMinSize({ minHeight: ControlSize.default }),
      ]}
    >
      {leading}
      <Column spacing={Spacing.xs} modifiers={[weight(1)]}>
        {children}
        {supportingText &&
          (typeof supportingText === "string" ? (
            <Text textStyle={{ color: Colors.muted }}>{supportingText}</Text>
          ) : (
            supportingText
          ))}
      </Column>
      {trailing}
    </Row>
  );
}
