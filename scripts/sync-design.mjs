// Copies the designer's token files into the app. Run `npm run sync:design` after design/ changes.
import { copyFileSync } from "node:fs";
copyFileSync("design/tokens.css", "src/app/tokens.css");
copyFileSync("design/tailwind.theme.extend.js", "tailwind.tokens.cjs");
console.log("design tokens synced");
