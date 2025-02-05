import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        fadeInTopDown: "fadeInTopDown 1s ease",
      },
      height: {
        'screen-minus-74': 'calc(100vh - 74px)',
        'screen-minus-250' : 'calc(100vh - 250px)',
        'screen-minus-310': 'calc(100vh - 310px)',
        'screen-minus-340': 'calc(100vh - 340px)',
      },
      keyframes: {
        fadeInTopDown: {
          "0%": {
            opacity: "0",
            transform: "translateY(-10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
