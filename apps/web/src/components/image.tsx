import type { ImageProps } from "@unpic/react";
import { Image as UnpicImage } from "@unpic/react/base";

export const Image = ({
  layout = "constrained",
  background,
  objectFit,
  ...props
}: Partial<ImageProps> &
  Pick<ImageProps, "src" | "alt"> & {
    objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  }) => {
  return (
    <UnpicImage
      {...(props as any)}
      layout={layout}
      background={background}
      style={{
        objectFit: objectFit,
        ...((props as any).style || {}),
      }}
    />
  );
};
