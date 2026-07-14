export const tokens = {
  // Spacing - 8px base grid
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  // Typography
  font: {
    family: { 
      sans: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif', 
      ui: 'Inter, system-ui, sans-serif',
      mono: 'SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace' 
    },
    size: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 36, ' 5xl': 48 },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  },
  // Colours - VoltAgent Design System
  color: {
    /* Primary Surfaces */
    bg: { 
      base: '#050507',        /* Abyss Black */
      surface: '#101010',     /* Carbon Surface */
      elevated: '#1A1E23',    /* Slightly elevated */
      border: '#3d3a39'       /* Warm Charcoal */
    },
    /* Text Hierarchy */
    text: { 
      primary: '#f2f2f2',     /* Snow White */
      secondary: '#b8b3b0',   /* Warm Parchment */
      muted: '#8b949e'        /* Steel Slate */
    },
    /* Brand Accent */
    brand: { 
      primary: '#00d992',     /* Emerald Signal Green */
      hover: '#00c182',       /* Emerald hover state */
      mint: '#2fd6a1',        /* VoltAgent Mint (button text) */
      light: 'rgba(0, 217, 146, 0.15)' /* Subtle tint */
    },
    /* Semantic States */
    status: { 
      success: '#008b00',     /* Success Emerald */
      warning: '#ffba00',     /* Warning Amber */
      error: '#fb565b',       /* Danger Coral */
      info: '#4cb3d4'         /* Info Teal */
    },
  },
} as const;
