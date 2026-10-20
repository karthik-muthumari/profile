const tokens = require("./tailwind.tokens.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  future: { hoverOnlyWhenSupported: true }, // :hover only on devices that really hover (no sticky hover on iOS)
  content: ["./src/**/*.{ts,tsx}", "./content/**/*.{md,mdx,ts}"],
  theme: { extend: tokens },
  plugins: [],
};
