import path from "path";
import type { Config } from "tailwindcss";

// https://magicui.design/docs/components/shimmer-button
const shimmerButton = {
  animation: {
    "shimmer-slide":
      "shimmer-slide var(--speed) ease-in-out infinite alternate",
    "spin-around": "spin-around calc(var(--speed) * 2) infinite linear",
  },
  keyframes: {
    "spin-around": {
      "0%": {
        transform: "translateZ(0) rotate(0)",
      },
      "15%, 35%": {
        transform: "translateZ(0) rotate(90deg)",
      },
      "65%, 85%": {
        transform: "translateZ(0) rotate(270deg)",
      },
      "100%": {
        transform: "translateZ(0) rotate(360deg)",
      },
    },
    "shimmer-slide": {
      to: {
        transform: "translate(calc(100cqw - 100%), 0)",
      },
    },
  },
};

// https://magicui.design/docs/components/retro-grid
const retroGrid = {
  animation: {
    grid: "grid 15s linear infinite",
  },
  keyframes: {
    grid: {
      "0%": { transform: "translateY(-50%)" },
      "100%": { transform: "translateY(0)" },
    },
  },
};

// https://github.com/shadcn-ui/ui/blob/1081536246b44b6664f4c99bc3f1b3614e632841/tailwind.config.cjs
const shadcn = {
  colors: {
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    primary: {
      DEFAULT: "hsl(var(--primary))",
      foreground: "hsl(var(--primary-foreground))",
    },
    secondary: {
      DEFAULT: "hsl(var(--secondary))",
      foreground: "hsl(var(--secondary-foreground))",
    },
    destructive: {
      DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
      foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
    },
    muted: {
      DEFAULT: "hsl(var(--muted))",
      foreground: "hsl(var(--muted-foreground))",
    },
    accent: {
      DEFAULT: "hsl(var(--accent))",
      foreground: "hsl(var(--accent-foreground))",
    },
    popover: {
      DEFAULT: "hsl(var(--popover))",
      foreground: "hsl(var(--popover-foreground))",
    },
    card: {
      DEFAULT: "hsl(var(--card))",
      foreground: "hsl(var(--card-foreground))",
    },
    sidebar: {
      DEFAULT: "hsl(var(--sidebar-background))",
      foreground: "hsl(var(--sidebar-foreground))",
      primary: "hsl(var(--sidebar-primary))",
      "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
      accent: "hsl(var(--sidebar-accent))",
      "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
      border: "hsl(var(--sidebar-border))",
      ring: "hsl(var(--sidebar-ring))",
    },
  },
  borderRadius: {
    xl: "calc(var(--radius) + 4px)",
    lg: "var(--radius)",
    md: "calc(var(--radius) - 2px)",
    sm: "calc(var(--radius) - 4px)",
  },
  animation: {
    "accordion-down": "accordion-down 0.2s ease-out",
    "accordion-up": "accordion-up 0.2s ease-out",
  },
  keyframes: {
    "accordion-down": {
      from: {
        height: "0",
      },
      to: {
        height: "var(--radix-accordion-content-height)",
      },
    },
    "accordion-up": {
      from: {
        height: "var(--radix-accordion-content-height)",
      },
      to: {
        height: "0",
      },
    },
  },
};

const config = {
  darkMode: ["class"],
  content: [path.resolve(__dirname, "src/components/**/*.tsx")],
  theme: {
    extend: {
      animation: {
        ...shimmerButton.animation,
        ...retroGrid.animation,
        ...shadcn.animation,
      },
      keyframes: {
        ...shimmerButton.keyframes,
        ...retroGrid.keyframes,
        ...shadcn.keyframes,
      },
      colors: shadcn.colors,
      borderRadius: shadcn.borderRadius,
    },
  },
  plugins: [],
} satisfies Config;

export default config;
