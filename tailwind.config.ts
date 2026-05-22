import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#161C24",
        card: "#202834",
        "card-inner": "#161C24",
        text: "#FFFFFF",
        muted: "#919EAB",
        accent: "#FF5630",
        "input-bg": "rgba(145, 158, 171, 0.16)",
      },
      fontFamily: {
        sans: ["var(--font-public-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-h1": ["64px", { lineHeight: "80px", letterSpacing: "0" }],
        "display-h2": ["48px", { lineHeight: "64px", letterSpacing: "0" }],
        timer: ["48px", { lineHeight: "64px", letterSpacing: "0" }],
      },
      maxWidth: {
        canvas: "1440px",
        bento: "983px",
      },
      borderRadius: {
        card: "24px",
        inner: "18px",
        control: "8px",
      },
      backgroundImage: {
        "btn-lock-in":
          "linear-gradient(150.49deg, #FFAC82 0%, #FF5630 100%)",
        "btn-primary":
          "linear-gradient(160.24deg, #C3DAF4 0%, #1C5EA4 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
