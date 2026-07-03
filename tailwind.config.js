/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF6EF",
        parchment: "#F2EBDC",
        ink: "#2B2420",
        plum: "#4A2A49",
        "plum-dark": "#331D33",
        gold: "#B98D4A",
        muted: "#8A7F72",
        rust: "#A6432F",
        line: "#E4DBC8",

        surface: "#1C1917",
        "surface-raised": "#26221F",
        "surface-sunken": "#151312",
        "border-dark": "#33302C",
        "ink-dark": "#EDE7DD",
        "muted-dark": "#9C9389",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
