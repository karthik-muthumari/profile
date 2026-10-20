"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import MotionPrefsProvider from "./MotionPrefs";

/**
 * next-themes injects a tiny blocking script in <head> that sets data-theme before first paint
 * (no flash). Default follows OS until the user toggles; choice is stored in localStorage['theme'].
 * Motion is handled by MotionPrefsProvider (three tiers: full / gentle / off), see MotionPrefs.tsx.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="system" enableSystem storageKey="theme" disableTransitionOnChange={false}>
      <MotionPrefsProvider>{children}</MotionPrefsProvider>
    </NextThemesProvider>
  );
}
