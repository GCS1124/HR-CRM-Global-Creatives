import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#081126",
          900: "#0d1b3c",
          800: "#10284f",
          700: "#0b3e74",
          600: "#1f4e7d",
          200: "#bfd2e8",
          100: "#e8f1fb",
          50: "#f5f8fd",
        },
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        display: ["Sora", "Manrope", "sans-serif"],
      },
      boxShadow: {
        soft: "0 20px 45px -22px rgba(11, 62, 116, 0.36)",
        panel: "0 26px 80px -36px rgba(8, 17, 38, 0.45)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(138deg, #0d1b3c 0%, #0f3360 45%, #1f4e7d 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
