import { Column, Icon } from "@expo/ui";
import { Image } from "@expo/ui/swift-ui";
import {
  accessibilityHidden,
  frame,
  resizable,
} from "@expo/ui/swift-ui/modifiers";
import { useAssets } from "expo-asset";

import {
  providerIconArtworkSize,
  providerIconSource,
} from "./provider-icon-assets";
import { useAppColorScheme, useColors } from "./theme-provider";

export function ProviderIcon({
  provider,
  size = 20,
}: {
  provider: string;
  size?: number;
}) {
  const scheme = useAppColorScheme();
  const Colors = useColors();
  const source = providerIconSource(provider, scheme);
  const artworkSize = providerIconArtworkSize(provider, size);
  return (
    <Column
      alignment="center"
      style={{
        width: size,
        paddingVertical: (size - artworkSize) / 2,
      }}
    >
      {source ? (
        <BundledIcon key={source} source={source} size={artworkSize} />
      ) : (
        <Icon name="shuffle" size={artworkSize} color={Colors.muted} />
      )}
    </Column>
  );
}

function BundledIcon({ source, size }: { source: number; size: number }) {
  const [assets] = useAssets(source);
  return assets?.[0].localUri ? (
    <Image
      uiImage={assets[0].localUri}
      modifiers={[
        resizable(),
        frame({ width: size, height: size }),
        accessibilityHidden(),
      ]}
    />
  ) : (
    <Column style={{ width: size, height: size }} />
  );
}
