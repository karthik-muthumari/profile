"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { MotionConfig } from "framer-motion";

/**
 * next-themes injects a tiny blocking script in <head> that sets data-theme before first paint
 * (no flash). Default follows OS until the user toggles; choice is stored in localStorage['theme'].
 * MotionConfig reducedMotion="user" makes every Framer Motion animation honour prefers-reduced-motion.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="system" enableSystem storageKey="theme" disableTransitionOnChange={false}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}
