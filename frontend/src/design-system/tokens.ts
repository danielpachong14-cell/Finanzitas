export const Colors = {
  primary: {
    light: '#66BB6A',
    dark: '#2E7D32',
    DEFAULT: '#4CAF50',
  },
  accent: {
    DEFAULT: '#EF5350',
    hover: '#E53935',
  },
  background: {
    app: '#F8FAF9',
    card: '#FFFFFF',
  },
  text: {
    main: '#1B3425',
    secondary: '#718096',
    inverse: '#FFFFFF',
  }
} as const;

export const Typography = {
  fontFamily: 'var(--font-inter), sans-serif',
  weights: {
    regular: 400,
    medium: 500,
    bold: 700,
  }
} as const;

export const Spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const;

export const Radii = {
  card: '24px',
  button: '9999px', // Pill shape
  input: '12px',
} as const;

export const Shadows = {
  card: '0 4px 20px rgba(0, 0, 0, 0.05)',
  button: '0 2px 10px rgba(76, 175, 80, 0.2)',
} as const;
