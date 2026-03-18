import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#0b1233",
          900: "#1a2a69",
          800: "#22357a",
          700: "#2d4090",
          600: "#3b82f6",
          500: "#4c6dd6",
          200: "#c7d5ff",
          100: "#e5ecff",
          50: "#f5f7ff",
        },
        accent: {
          600: "#ea580c",
          500: "#f97316",
          200: "#fed7aa",
          100: "#ffedd5",
          50: "#fff7ed",
        },
        secondary: {
          600: "#2563eb",
          500: "#3b82f6",
          200: "#bfdbfe",
          100: "#dbeafe",
          50: "#eff6ff",
        },
        ink: "#0f172a",
        base: "#f8fafc",
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        display: ["Sora", "Manrope", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 40px -24px rgba(26, 42, 105, 0.35)",
        panel: "0 26px 80px -36px rgba(15, 23, 42, 0.45)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(138deg, #1a2a69 0%, #22357a 40%, #3b82f6 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
