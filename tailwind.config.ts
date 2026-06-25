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
        /* Semantic, theme-aware tokens (resolve via [data-theme]) */
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
        },
        beige: 'var(--beige)',
        accent: {
          DEFAULT: 'var(--accent)',
        },
        pill: {
          DEFAULT: 'var(--pill-bg)',
          text: 'var(--pill-text)',
        },
        bubble: {
          'sent-bg': 'var(--bubble-sent-bg)',
          'sent-text': 'var(--bubble-sent-text)',
          'received-bg': 'var(--bubble-received-bg)',
          'received-text': 'var(--bubble-received-text)',
        },
        line: 'var(--border)',
        'line-strong': 'var(--border-strong)',
        'gold-wgy': 'var(--gold-wgy)',
        status: {
          success: 'var(--success)',
          'success-bg': 'var(--success-bg)',
          error: 'var(--error)',
          'error-bg': 'var(--error-bg)',
        },
      },
      borderRadius: {
        card: 'var(--radius-card)',
        button: 'var(--radius-pill)',
        pill: 'var(--radius-pill)',
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
