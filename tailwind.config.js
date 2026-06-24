/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        shine: "shine 5s ease-in-out infinite",
        "shimmer-ribbon": "shimmerRibbon 3.5s ease-in-out infinite",
      },
      keyframes: {
        shine: {
          "0%": { left: "150%" },
          "20%": { left: "-150%" },
          "100%": { left: "-150%" },
        },
        shimmerRibbon: {
          "0%": { left: "-40%" },
          "50%": { left: "105%" },
          "100%": { left: "105%" },
        },
      },
    },
  },
  plugins: [],
};
