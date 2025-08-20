// 🎨 PDF THEME SYSTEM

export type ThemeName = 
  | 'default' 
  | 'light' 
  | 'dark' 
  | 'corporate' 
  | 'ocean' 
  | 'sunset' 
  | 'forest' 
  | 'sci-fi' 
  | 'retro' 
  | 'spring' 
  | 'summer' 
  | 'winter';

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
        background: [255, 255, 255],      // Pure white
        mainContent: [33, 33, 33],        // Dark charcoal
        headers: [0, 0, 0],               // Black
        metadata: [102, 102, 102],        // Medium gray
        hyprnoteLink: [59, 130, 246],     // Blue
        separatorLine: [229, 229, 229],   // Light gray
        bullets: [75, 85, 99],            // Slate gray
      }
    },

    light: {
      font: "helvetica",
      colors: {
        background: [250, 250, 250],      // Off-white
        mainContent: [55, 65, 81],        // Gray 700
        headers: [17, 24, 39],            // Gray 900
        metadata: [107, 114, 128],        // Gray 500
        hyprnoteLink: [99, 102, 241],     // Indigo
        separatorLine: [209, 213, 219],   // Gray 300
        bullets: [75, 85, 99],            // Gray 600
      }
    },

    dark: {
      font: "verdana",
      colors: {
        background: [17, 24, 39],         // Gray 900
        mainContent: [229, 231, 235],     // Gray 200
        headers: [255, 255, 255],         // White
        metadata: [156, 163, 175],        // Gray 400
        hyprnoteLink: [147, 197, 253],    // Light blue
        separatorLine: [55, 65, 81],      // Gray 700
        bullets: [209, 213, 219],         // Gray 300
      }
    },

    corporate: {
      font: "times new roman",
      colors: {
        background: [255, 255, 255],      // Pure white
        mainContent: [15, 23, 42],        // Slate 900
        headers: [30, 41, 59],            // Slate 800
        metadata: [100, 116, 139],        // Slate 500
        hyprnoteLink: [30, 64, 175],      // Professional blue
        separatorLine: [203, 213, 225],   // Slate 300
        bullets: [51, 65, 85],            // Slate 700
      }
    },

    ocean: {
      font: "helvetica",
      colors: {
        background: [236, 254, 255],      // Cyan 50
        mainContent: [22, 78, 99],        // Cyan 800
        headers: [5, 39, 103],            // Blue 900
        metadata: [14, 116, 144],         // Cyan 700
        hyprnoteLink: [8, 145, 178],      // Cyan 600
        separatorLine: [165, 243, 252],   // Cyan 200
        bullets: [34, 211, 238],          // Cyan 400
      }
    },

    sunset: {
      font: "helvetica",
      colors: {
        background: [255, 251, 235],      // Orange 50
        mainContent: [124, 45, 18],       // Orange 900
        headers: [154, 52, 18],           // Orange 800
        metadata: [194, 65, 12],          // Orange 700
        hyprnoteLink: [234, 88, 12],      // Orange 600
        separatorLine: [254, 215, 170],   // Orange 200
        bullets: [251, 146, 60],          // Orange 400
      }
    },

    forest: {
      font: "helvetica",
      colors: {
        background: [240, 253, 244],      // Green 50
        mainContent: [20, 83, 45],        // Green 800
        headers: [22, 101, 52],           // Green 700
        metadata: [21, 128, 61],          // Green 600
        hyprnoteLink: [34, 197, 94],      // Green 500
        separatorLine: [187, 247, 208],   // Green 200
        bullets: [74, 222, 128],          // Green 400
      }
    },

    'sci-fi': {
      font: "helvetica",
      colors: {
        background: [6, 15, 25],          // Dark blue-black
        mainContent: [0, 255, 204],       // Cyan green
        headers: [0, 255, 255],           // Pure cyan
        metadata: [102, 204, 255],        // Light blue
        hyprnoteLink: [255, 0, 255],      // Magenta
        separatorLine: [0, 102, 153],     // Dark blue
        bullets: [0, 255, 128],           // Bright green
      }
    },

    retro: {
      font: "helvetica",
      colors: {
        background: [254, 249, 195],      // Yellow 100
        mainContent: [120, 53, 15],       // Orange 900
        headers: [146, 64, 14],           // Orange 800
        metadata: [180, 83, 9],           // Orange 700
        hyprnoteLink: [202, 138, 4],      // Yellow 600
        separatorLine: [254, 240, 138],   // Yellow 200
        bullets: [245, 158, 11],          // Amber 500
      }
    },

    spring: {
      font: "helvetica",
      colors: {
        background: [247, 254, 231],      // Lime 50
        mainContent: [54, 83, 20],        // Lime 800
        headers: [77, 124, 15],           // Lime 700
        metadata: [101, 163, 13],         // Lime 600
        hyprnoteLink: [132, 204, 22],     // Lime 500
        separatorLine: [217, 249, 157],   // Lime 200
        bullets: [163, 230, 53],          // Lime 400
      }
    },

    summer: {
      font: "helvetica",
      colors: {
        background: [255, 247, 237],      // Orange 25
        mainContent: [154, 52, 18],       // Orange 800
        headers: [194, 65, 12],           // Orange 700
        metadata: [234, 88, 12],          // Orange 600
        hyprnoteLink: [251, 146, 60],     // Orange 400
        separatorLine: [254, 215, 170],   // Orange 200
        bullets: [255, 154, 0],           // Bright orange
      }
    },

    winter: {
      font: "helvetica",
      colors: {
        background: [241, 245, 249],      // Slate 100
        mainContent: [30, 41, 59],        // Slate 800
        headers: [15, 23, 42],            // Slate 900
        metadata: [71, 85, 105],          // Slate 600
        hyprnoteLink: [59, 130, 246],     // Blue 500
        separatorLine: [203, 213, 225],   // Slate 300
        bullets: [100, 116, 139],         // Slate 500
      }
    }
  };

  return themes[themeName] || themes.default;
};

// Helper function to get all available theme names
export const getAvailableThemes = (): ThemeName[] => {
  return [
    'default', 
    'light', 
    'dark', 
    'corporate', 
    'ocean', 
    'sunset', 
    'forest', 
    'sci-fi', 
    'retro', 
    'spring', 
    'summer', 
    'winter'
  ];
};

// Helper function to get theme preview info
export const getThemePreview = (themeName: ThemeName) => {
  const theme = getPDFTheme(themeName);
  return {
    name: themeName,
    font: theme.font,
    primaryColor: theme.colors.headers,
    backgroundColor: theme.colors.background,
    description: getThemeDescription(themeName)
  };
};

const getThemeDescription = (themeName: ThemeName): string => {
  const descriptions: Record<ThemeName, string> = {
    default: "Clean charcoal text on white with Helvetica",
    light: "Subtle grays on off-white with Helvetica",
    dark: "Light text on dark slate with Verdana",
    corporate: "Professional navy on white with Times New Roman",
    ocean: "Deep blues on cyan background with Optima",
    sunset: "Warm oranges on cream with Palatino",
    forest: "Natural greens on light green with Verdana",
    'sci-fi': "Neon cyan on dark blue-black with Helvetica",
    retro: "Vintage browns on yellow with Times New Roman",
    spring: "Fresh lime greens on light background with Optima",
    summer: "Bright oranges on warm cream with Noteworthy",
    winter: "Cool slate tones on light blue with Palatino"
  };
  
  return descriptions[themeName] || descriptions.default;
};
