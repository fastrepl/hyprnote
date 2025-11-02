import type { ImageProps } from "@unpic/react";
import { Image as UnpicImage } from "@unpic/react/base";
import { transform } from "unpic/providers/netlify";

export const Image = ({
  layout = "constrained",
  ...props
}: Partial<ImageProps> & Pick<ImageProps, "src" | "alt">) => {
  return (
    <UnpicImage
      {...props as any}
      layout={layout}
      transformer={transform}
    />
  );
};
