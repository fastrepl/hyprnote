export type ThemeName =
  | "default"
  | "light"
  | "dark"
  | "corporate"
  | "ocean"
  | "sunset"
  | "forest"
  | "cyberpunk"
  | "retro"
  | "spring"
  | "summer"
  | "winter"
  | "homebrew";

export interface PDFTheme {
  font: string;
  colors: {
    background: readonly [number, number, number];
    mainContent: readonly [number, number, number];
    headers: readonly [number, number, number];
    metadata: readonly [number, number, number];
    hyprnoteLink: readonly [number, number, number];
    separatorLine: readonly [number, number, number];
    bullets: readonly [number, number, number];
  };
}

export const getPDFTheme = (themeName: ThemeName): PDFTheme => {
  const themes: Record<ThemeName, PDFTheme> = {
    default: {
      font: "helvetica",
      colors: {
        background: [255, 255, 255], // Pure white (kept as requested)
        mainContent: [33, 33, 33], // Dark charcoal
        headers: [0, 0, 0], // Black
        metadata: [102, 102, 102], // Medium gray
        hyprnoteLink: [59, 130, 246], // Blue
        separatorLine: [229, 229, 229], // Light gray
        bullets: [75, 85, 99], // Slate gray
      },
    },

    light: {
      font: "helvetica",
      colors: {
        background: [248, 250, 252], // Very light blue
        mainContent: [30, 58, 138], // Deep blue
        headers: [15, 23, 42], // Navy
        metadata: [100, 116, 139], // Steel blue
        hyprnoteLink: [37, 99, 235], // Bright blue
        separatorLine: [186, 230, 253], // Light sky blue
        bullets: [59, 130, 246], // Blue
      },
    },

    dark: {
      font: "helvetica",
      colors: {
        background: [15, 15, 15], // Almost black
        mainContent: [220, 220, 220], // Light gray
        headers: [255, 255, 255], // White
        metadata: [140, 140, 140], // Medium gray
        hyprnoteLink: [96, 165, 250], // Light blue
        separatorLine: [40, 40, 40], // Dark gray
        bullets: [180, 180, 180], // Light gray
      },
    },

    corporate: {
      font: "times",
      colors: {
        background: [255, 255, 255], // Pure white (kept unchanged)
        mainContent: [15, 23, 42], // Slate 900
        headers: [30, 41, 59], // Slate 800
        metadata: [100, 116, 139], // Slate 500
        hyprnoteLink: [30, 64, 175], // Professional blue
        separatorLine: [203, 213, 225], // Slate 300
        bullets: [51, 65, 85], // Slate 700
      },
    },

    ocean: {
      font: "helvetica",
      colors: {
        background: [240, 249, 255], // Light ocean blue
        mainContent: [7, 89, 133], // Deep ocean blue
        headers: [12, 74, 110], // Ocean blue
        metadata: [14, 116, 144], // Teal
        hyprnoteLink: [6, 182, 212], // Cyan
        separatorLine: [165, 243, 252], // Light cyan
        bullets: [34, 211, 238], // Bright cyan
      },
    },

    sunset: {
      font: "times",
      colors: {
        background: [255, 247, 237], // Warm cream
        mainContent: [120, 53, 15], // Dark brown
        headers: [194, 65, 12], // Orange red
        metadata: [156, 105, 23], // Amber
        hyprnoteLink: [234, 88, 12], // Bright orange
        separatorLine: [254, 215, 170], // Peach
        bullets: [251, 146, 60], // Orange
      },
    },

    forest: {
      font: "helvetica",
      colors: {
        background: [236, 253, 245], // Mint green
        mainContent: [20, 83, 45], // Forest green
        headers: [5, 46, 22], // Dark forest green
        metadata: [21, 128, 61], // Green
        hyprnoteLink: [34, 197, 94], // Bright green
        separatorLine: [167, 243, 208], // Light green
        bullets: [74, 222, 128], // Lime green
      },
    },

    cyberpunk: {
      font: "helvetica",
      colors: {
        background: [3, 7, 18], // Deep space black
        mainContent: [0, 255, 204], // Matrix green
        headers: [0, 255, 255], // Electric cyan
        metadata: [102, 204, 255], // Neon blue
        hyprnoteLink: [255, 0, 255], // Electric magenta
        separatorLine: [0, 102, 153], // Dark blue
        bullets: [0, 255, 128], // Bright green
      },
    },

    retro: {
      font: "courier",
      colors: {
        background: [139, 69, 19], // Dark brown (much darker!)
        mainContent: [255, 248, 220], // Cream text
        headers: [255, 215, 0], // Gold
        metadata: [222, 184, 135], // Burlywood
        hyprnoteLink: [255, 140, 0], // Dark orange
        separatorLine: [160, 82, 45], // Saddle brown
        bullets: [255, 165, 0], // Orange
      },
    },

    spring: {
      font: "courier",
      colors: {
        background: [254, 249, 195], // Light yellow green
        mainContent: [56, 142, 60], // Green
        headers: [27, 94, 32], // Dark green
        metadata: [76, 175, 80], // Light green
        hyprnoteLink: [139, 195, 74], // Lime
        separatorLine: [200, 230, 201], // Very light green
        bullets: [104, 159, 56], // Olive green
      },
    },

    summer: {
      font: "helvetica",
      colors: {
        background: [255, 235, 59], // Bright yellow
        mainContent: [191, 54, 12], // Deep red orange
        headers: [213, 0, 0], // Red
        metadata: [255, 87, 34], // Orange red
        hyprnoteLink: [255, 152, 0], // Orange
        separatorLine: [255, 193, 7], // Amber
        bullets: [244, 67, 54], // Red
      },
    },

    winter: {
      font: "times",
      colors: {
        background: [233, 242, 251], // Icy blue
        mainContent: [13, 71, 161], // Deep blue
        headers: [25, 118, 210], // Blue
        metadata: [66, 165, 245], // Light blue
        hyprnoteLink: [33, 150, 243], // Sky blue
        separatorLine: [187, 222, 251], // Very light blue
        bullets: [100, 181, 246], // Light blue
      },
    },

    homebrew: {
      font: "courier",
      colors: {
        background: [0, 0, 0], // Terminal black
        mainContent: [0, 255, 0], // Terminal green
        headers: [0, 255, 128], // Bright terminal green
        metadata: [128, 255, 128], // Light terminal green
        hyprnoteLink: [0, 255, 255], // Terminal cyan
        separatorLine: [0, 128, 0], // Dark green
        bullets: [0, 255, 0], // Terminal green
      },
    },
  };

  return themes[themeName] || themes.default;
};

export const getAvailableThemes = (): ThemeName[] => {
  return [
    "default",
    "light",
    "dark",
    "corporate",
    "ocean",
    "sunset",
    "forest",
    "cyberpunk",
    "retro",
    "spring",
    "summer",
    "winter",
    "homebrew",
  ];
};

export const getThemePreview = (themeName: ThemeName) => {
  const theme = getPDFTheme(themeName);
  return {
    name: themeName,
    font: theme.font,
    primaryColor: theme.colors.headers,
    backgroundColor: theme.colors.background,
    description: getThemeDescription(themeName),
  };
};

const getThemeDescription = (themeName: ThemeName): string => {
  const descriptions: Record<ThemeName, string> = {
    default: "Clean charcoal text on white with Helvetica",
    light: "Deep blues on light blue with Helvetica",
    dark: "Light text on deep black with Helvetica",
    corporate: "Professional navy on white with Times",
    ocean: "Ocean blues on light cyan with Helvetica",
    sunset: "Warm browns and oranges on cream with Times",
    forest: "Forest greens on mint background with Courier",
    cyberpunk: "Matrix green on space black with Courier",
    retro: "Gold text on dark brown with Courier",
    spring: "Fresh greens on yellow-green with Courier",
    summer: "Bright reds on yellow with Courier",
    winter: "Deep blues on icy background with Times",
    homebrew: "Classic terminal green on black with Courier",
  };

  return descriptions[themeName] || descriptions.default;
};
