import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ], // Enable dark mode variants
  theme: {
    extend: {
      colors: {
        // Common Colors
        bgBlack: "#1B1B1B",
        bgGrey: "#D9D9D9",
        textGrey: "#6C6C6C",
        borderGrey: "#E8E6F1",
        midGrey: "#959595",
        silver: "#e5e5e5",
        darkGrey: "#484848",
        lightSilver: "#e0e0e0",
        perfectWhite: "#f1eeee",
        whiteSmoke: "#f5f5f5",
        charcoal: "#1D1D1D",
        charcoalGrey: "#4a4a4a",
        greyishPurple: "#8d7ab10",
      },
      boxShadow: {
        // Hover Effects
        primaryShadow: "0 8px 26px rgba(141, 122, 177, .5)",
        primaryGlow: "0 20px 26px rgba(141, 122, 177, .8)",
        greyLightShadow: "0 5px 100px rgba(0, 0, 0, 0.1)",
        primaryLighterShadow: "0 8px 20px rgba(255, 216, 0, .1)",
        primaryLightShadow: "0 8px 20px rgba(141, 122, 177, .35)",
        primaryDarkShadow: "0 8px 20px rgba(141, 122, 177, .15)",
        blackLightShadow: "0 8px 20px rgba(0, 0, 0, .15)",
        cardShadow: "0 8px 26px rgba(141, 122, 177, .85)",
      },
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
        unica: ["Unica One", "sans-serif"],
      },
      borderRadius: {
        // Define border radius sizes here
      },
    },
  },
  variants: {
    extend: {
      // Add additional variants as needed
    },
  },
  plugins: [
    // Optionally enable plugins if needed
    // require('@tailwindcss/typography'),
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/aspect-ratio'),
  ],
};

export default config;
