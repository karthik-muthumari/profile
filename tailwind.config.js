const tokens = require("./tailwind.tokens.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}", "./content/**/*.{md,mdx,ts}"],
  theme: { extend: tokens },
  plugins: [],
};
