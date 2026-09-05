/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Khatabook exact colors
        "primary": "#1976d2",
        "primary-container": "#e3f2fd",
        "on-primary": "#ffffff",
        "on-primary-container": "#1565c0",
        "secondary": "#1976d2",
        "on-secondary": "#ffffff",
        "secondary-container": "#bbdefb",
        "on-secondary-container": "#0d47a1",
        "tertiary": "#2e7d32",          // Green - You Got
        "on-tertiary": "#ffffff",
        "tertiary-container": "#e8f5e9",
        "on-tertiary-container": "#1b5e20",
        "error": "#d32f2f",             // Red - You Gave
        "on-error": "#ffffff",
        "error-container": "#ffebee",
        "on-error-container": "#c62828",
        "background": "#f5f5f5",
        "on-background": "#212121",
        "surface": "#ffffff",
        "on-surface": "#212121",
        "on-surface-variant": "#616161",
        "outline": "#bdbdbd",
        "outline-variant": "#e0e0e0",
        // Sidebar 
        "sidebar": "#0D1726",
        "sidebar-border": "#1e2d42",
        // Legacy aliases
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#fafafa",
        "surface-container": "#f5f5f5",
        "surface-container-high": "#eeeeee",
        "surface-container-highest": "#e0e0e0",
        "tertiary-fixed": "#a5d6a7",
        "tertiary-fixed-dim": "#81c784",
        "on-tertiary-fixed": "#1b5e20",
        "error-container": "#ffebee",
        "secondary-fixed": "#bbdefb",
        "primary-fixed": "#e3f2fd",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "sm": "0.125rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
      fontFamily: {
        "body": ["Noto Sans", "sans-serif"],
        "sans": ["Noto Sans", "sans-serif"],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
