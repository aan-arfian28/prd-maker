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
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            pre: {
              backgroundColor: "#1e293b",
              color: "#e2e8f0",
              borderRadius: "0.5rem",
              padding: "1rem",
            },
            code: {
              backgroundColor: "#f1f5f9",
              color: "#1e293b",
              padding: "0.125rem 0.25rem",
              borderRadius: "0.25rem",
              fontWeight: "400",
              "&::before": { content: '""' },
              "&::after": { content: '""' },
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
