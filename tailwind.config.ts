import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#222222',
          surface: '#2a2a2a',
          elevated: '#333333',
        },
        accent: {
          DEFAULT: '#e4dcd1',
          muted: 'rgba(228, 220, 209, 0.15)',
        },
        brand: {
          charcoal: '#222222',
          white: '#ffffff',
          linen: '#e4dcd1',
          warmgrey: '#706b6b',
          gold: '#9b7e56',
        },
        status: {
          success: '#27AE60',
          error: '#C0392B',
          warning: '#E67E22',
        },
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        pill: '20px',
        modal: '16px',
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
