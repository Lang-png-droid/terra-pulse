import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'tp-bg': '#000000',
        'tp-panel': '#0A0A0A',
        'tp-surface': '#111111',
        'tp-border': '#222222',
        'tp-line': '#222222',
        'tp-cyan': '#38BDF8',
        'tp-violet': '#FFFFFF',
        'tp-critical': '#FF4D2A',
        'tp-high': '#FF4D2A',
        'tp-watch': '#F59E0B',
        'tp-normal': '#71717A',
        'tp-quake': '#FF4D2A',
        'tp-fire': '#F59E0B',
        'tp-ice': '#38BDF8',
        'tp-text': '#FFFFFF',
        'tp-muted': '#71717A',
        'tp-dim': '#3F3F46',
      },
      fontFamily: {
        mono: ['Fira Code', 'Share Tech Mono', 'ui-monospace', 'monospace'],
        geo: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;