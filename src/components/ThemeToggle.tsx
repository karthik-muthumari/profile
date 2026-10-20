"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { spring } from "@/lib/motion";
import { useMotionTier } from "./MotionPrefs";

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/**
 * 40×40 sun/moon toggle (04 §9). next-themes handles persistence (localStorage['theme']),
 * the no-flash head script and data-theme on <html>. We add: icon morph, .theme-transition
 * cross-fade, and a circular View Transition reveal where supported (skipped for reduced motion).
 */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const reduce = useMotionTier() !== "full"; // no circular reveal / icon spin unless the Full tier is active
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme !== "light";
  const next = isDark ? "light" : "dark";

  const apply = () => {
    document.documentElement.dataset.theme = next; // synchronous, so the view-transition snapshot sees it
    setTheme(next);
  };

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const doc = document as VTDocument;
    if (reduce) return apply();
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches; // iOS: full-page snapshot reveal is janky
    if (doc.startViewTransition && !touch) {
      const r = e.currentTarget.getBoundingClientRect();
      root.style.setProperty("--vt-x", `${r.left + r.width / 2}px`);
      root.style.setProperty("--vt-y", `${r.top + r.height / 2}px`);
      doc.startViewTransition(apply);
      return;
    }
    root.classList.add("theme-transition");
    apply();
    window.setTimeout(() => root.classList.remove("theme-transition"), 450);
  };

  // Server/first-client render shows a neutral moon so markup is stable; label is set after mount.
  const showSun = mounted && isDark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mounted ? `Switch to ${next} theme` : "Switch theme"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-line-strong text-fg transition-colors hover:bg-surface-2"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={showSun ? "sun" : "moon"}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0, transition: { duration: 0.15 } }}
          transition={spring.snappy}
          className="inline-flex"
          aria-hidden
        >
          {showSun ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
