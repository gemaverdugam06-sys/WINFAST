/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui"],
        display: ["Space Grotesk", "DM Sans", "system-ui"],
      },
      colors: {
        background: "#f5f7f1",
        foreground: "#1a2d24",
        card: "#ffffff",
        border: "#dbe4d8",
        input: "#cbd8c9",
        muted: "#eef2e9",
        "muted-foreground": "#647267",
        primary: "#195e48",
        "primary-foreground": "#ffffff",
        secondary: "#b34b32",
        "secondary-foreground": "#ffffff",
        accent: "#eaf1df",
        "accent-foreground": "#1a2d24",
        destructive: "#ef4444",
        "destructive-foreground": "#ffffff",
        ring: "#588d57",
        popover: "#ffffff",
        "popover-foreground": "#0f172a",
        success: "#25835d",
        warning: "#e9af3b",
        "warning-foreground": "#26301f",
      },
      fontSize: {
        "hero-sm": ["1.875rem", { lineHeight: "1.05" }] /* 30px */,
        "hero-md": ["3rem", { lineHeight: "1.03" }] /* 48px */,
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(105deg, #124b39 0%, #1b6348 100%)",
        "gradient-hero": "linear-gradient(115deg, #123f34 0%, #195e48 70%, #638b45 100%)",
      },
      boxShadow: {
        card: "0 8px 24px -14px rgba(21, 61, 41, 0.2)",
        hover: "0 20px 40px -20px rgba(15, 23, 42, 0.15)",
      },
    },
  },
  plugins: [],
};
