import * as SliderPrimitive from "@radix-ui/react-slider";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const sliderVariants = cva(
  "relative flex w-full touch-none select-none items-center",
  {
    variants: {
      size: {
        sm: "h-4",
        default: "h-5",
        lg: "h-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const trackVariants = cva(
  "relative h-2 w-full grow overflow-hidden rounded-full bg-input",
  {
    variants: {
      size: {
        sm: "h-1.5",
        default: "h-2",
        lg: "h-2.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const rangeVariants = cva(
  "absolute h-full bg-primary",
);

const thumbVariants = cva(
  "block rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-5 w-5",
        lg: "h-6 w-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, VariantProps<typeof sliderVariants>
{}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, size, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(sliderVariants({ size }), className)}
    {...props}
  >
    <SliderPrimitive.Track className={cn(trackVariants({ size }))}>
      <SliderPrimitive.Range className={cn(rangeVariants())} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={cn(thumbVariants({ size }))} />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
