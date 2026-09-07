import { Column, FieldGroup as NativeFieldGroup } from "@expo/ui";
import { LazyColumn } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { Children, isValidElement, type ComponentProps } from "react";
import { StyleSheet } from "react-native";

import { Radius, Spacing, Typography } from "@/constants/theme";

import { FieldFooter, Text } from "./fields";
import { useColors } from "./theme-provider";

function SettingsFieldGroup({
  children,
}: ComponentProps<typeof NativeFieldGroup>) {
  return (
    <LazyColumn
      verticalArrangement={{ spacedBy: Spacing.lg }}
      contentPadding={{
        start: Spacing.md,
        end: Spacing.md,
        top: Spacing.md,
        bottom: Spacing.lg,
      }}
    >
      {children}
    </LazyColumn>
  );
}

function Section({
  children,
  title,
}: ComponentProps<typeof NativeFieldGroup.Section>) {
  const Colors = useColors();
  const content = Children.toArray(children);
  const footers = content.filter(
    (child) => isValidElement(child) && child.type === SectionFooter,
  );
  const rows = content.filter(
    (child) => !isValidElement(child) || child.type !== SectionFooter,
  );
  return (
    <Column spacing={Spacing.sm} modifiers={[fillMaxWidth()]}>
      {title && (
        <Text
          textStyle={{ ...Typography.section, color: Colors.muted }}
          style={{ paddingHorizontal: Spacing.compact }}
        >
          {title}
        </Text>
      )}
      {rows.length > 0 && (
        <Column
          spacing={Spacing.compact}
          modifiers={[fillMaxWidth()]}
          style={{
            backgroundColor: Colors.surface,
            borderColor: Colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: Radius.card,
            padding: Spacing.compact,
          }}
        >
          {rows}
        </Column>
      )}
      {footers}
    </Column>
  );
}

function SectionFooter({
  children,
}: ComponentProps<typeof NativeFieldGroup.SectionFooter>) {
  return (
    <Column style={{ paddingHorizontal: Spacing.compact }}>
      <FieldFooter>{children}</FieldFooter>
    </Column>
  );
}

export const FieldGroup = Object.assign(SettingsFieldGroup, {
  Section,
  SectionFooter,
});
