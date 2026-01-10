import type { ImageProps } from "@unpic/react";
import { Image as UnpicImage } from "@unpic/react/base";
import { transform } from "unpic/providers/netlify";

export const Image = ({
  layout = "constrained",
  background,
  objectFit,
  src,
  ...props
}: Partial<ImageProps> &
  Pick<ImageProps, "src" | "alt"> & {
    objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  }) => {
  const isExternalUrl =
    typeof src === "string" &&
    (src.startsWith("http://") || src.startsWith("https://"));

  return (
    <UnpicImage
      {...(props as any)}
      src={src}
      {...(isExternalUrl ? {} : { transformer: transform })}
      layout={layout}
      background={background}
      style={{
        objectFit: objectFit,
        ...((props as any).style || {}),
      }}
    />
  );
};
