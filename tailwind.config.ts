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
        surface: "#0B0B0D",
        cream: "#F5F0E8",
        accent: "#FF6B6B",
        warning: "#E53935",
        "warm-white": "#F8F4EF",
      },
      borderRadius: {
        card: "28px",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      animation: {
        breathe: "breathe 3s ease-in-out infinite",
        "siren-red": "sirenFlash 0.4s ease-in-out infinite alternate",
        "siren-blue": "sirenFlashBlue 0.4s ease-in-out infinite alternate-reverse",
        float: "float 4s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
        },
        sirenFlash: {
          "0%": { opacity: "0.15" },
          "100%": { opacity: "0.55" },
        },
        sirenFlashBlue: {
          "0%": { opacity: "0.1" },
          "100%": { opacity: "0.45" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
