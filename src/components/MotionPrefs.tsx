"use client";
/**
 * Motion tiers (design/07 §3.1):
 *   full   – everything (default when the OS has no reduce preference)
 *   gentle – default for OS "reduce motion": fades + ≤12px entrances, soft avatar float, nothing spins/scales
 *   off    – final states immediately, nothing moves
 * The tier is stored in localStorage['motion'] (try/catch) and mirrored on <html data-motion>.
 * A blocking inline script in layout.tsx sets data-motion before first paint so CSS applies without flash.
 */
import { createContext, Fragment, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { buildMotion, type MotionSet, type MotionTier } from "@/lib/motion";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const KEY = "motion";

interface Ctx {
  tier: MotionTier;
  /** true when the tier was chosen automatically because the device asks for reduced motion / data saving */
  auto: boolean;
  setTier: (t: MotionTier) => void;
  m: MotionSet;
}

const DEFAULT: Ctx = { tier: "full", auto: false, setTier: () => {}, m: buildMotion("full", false) };
const MotionCtx = createContext<Ctx>(DEFAULT);

export const useMotionPrefs = () => useContext(MotionCtx);
/** The tier- and breakpoint-aware variants / viewport options. */
export const useMotion = () => useContext(MotionCtx).m;
export const useMotionTier = () => useContext(MotionCtx).tier;

function readStored(): MotionTier | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "full" || v === "gentle" || v === "off" ? v : null;
  } catch {
    return null;
  }
}
function deviceWantsLess(): boolean {
  try {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches || !!conn?.saveData;
  } catch {
    return false;
  }
}
function resolve(): { tier: MotionTier; auto: boolean } {
  const stored = readStored();
  if (stored) return { tier: stored, auto: false };
  return deviceWantsLess() ? { tier: "gentle", auto: true } : { tier: "full", auto: false };
}

export default function MotionPrefsProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTierState] = useState<MotionTier>("full");
  const [auto, setAuto] = useState(false);
  const [mobile, setMobile] = useState(false);
  // Remount the tree ONCE only if the stored/OS tier is not "full" (hidden styles differ per tier). Phones/desktops
  // share identical hidden values, so a breakpoint never needs a remount (a remount during hydration + image decode
  // was a prime suspect for lost entrance animations on iOS). Happens in a layout effect → before first paint.
  const [gate, setGate] = useState("ssr");
  const first = useRef(true);

  useIsoLayoutEffect(() => {
    const r = resolve();
    // "mobile" = touch-first device OR narrow viewport (an iPhone in landscape is 932px wide but still touch)
    const mqs = [window.matchMedia("(max-width: 767px)"), window.matchMedia("(hover: none) and (pointer: coarse)")];
    const isMobile = () => mqs.some((q) => q.matches);
    setTierState(r.tier);
    setAuto(r.auto);
    setMobile(isMobile());
    document.documentElement.dataset.motion = r.tier;
    document.documentElement.dataset.hydrated = "1"; // disarms the CSS "never hydrated" failsafe
    if (first.current) {
      first.current = false;
      if (r.tier !== "full") setGate(r.tier);
    }
    const on = () => setMobile(isMobile());
    mqs.forEach((q) => q.addEventListener("change", on));
    return () => mqs.forEach((q) => q.removeEventListener("change", on));
  }, []);

  const setTier = useCallback((t: MotionTier) => {
    setTierState(t);
    setAuto(false);
    document.documentElement.dataset.motion = t;
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable (private mode etc.) – choice applies for this visit only */
    }
  }, []);

  const m = useMemo(() => buildMotion(tier, mobile), [tier, mobile]);
  const value = useMemo<Ctx>(() => ({ tier, auto, setTier, m }), [tier, auto, setTier, m]);

  return (
    <MotionCtx.Provider value={value}>
      {/* We implement the tiers ourselves, so Framer must not silently strip transforms; "off" is belt-and-braces. */}
      <MotionConfig reducedMotion={tier === "off" ? "always" : "never"}>
        <Fragment key={gate}>{children}</Fragment>
      </MotionConfig>
    </MotionCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Failsafe: if IntersectionObserver misses (iOS URL-bar collapse, fast scroll, throttled CPU), force-reveal any */
/* element that is on screen 2.5s after mount, and re-check on scroll-end / resize / orientation change.          */
/* ------------------------------------------------------------------ */
const WAIT = 2500;
const pending = new Set<() => boolean>();
let attached = false;
let debounce: number | undefined;

function sweep() {
  pending.forEach((fn) => {
    if (fn()) pending.delete(fn);
  });
  if (!pending.size) detach();
}
function schedule() {
  window.clearTimeout(debounce);
  debounce = window.setTimeout(sweep, 250);
}
function attach() {
  if (attached) return;
  attached = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("scrollend", sweep);
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
}
function detach() {
  attached = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("scrollend", sweep);
  window.removeEventListener("resize", schedule);
  window.removeEventListener("orientationchange", schedule);
}

/** Returns [ref, forced]. Pass `animate={forced ? "show" : undefined}` next to `whileInView`. */
export function useFailsafe<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [forced, setForced] = useState(false);
  useEffect(() => {
    const t0 = performance.now();
    const check = () => {
      const el = ref.current;
      if (!el) return false;
      if (performance.now() - t0 < WAIT) return false;
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight * 1.05) {
        setForced(true);
        return true;
      }
      return false;
    };
    pending.add(check);
    attach();
    const id = window.setTimeout(() => {
      if (check()) pending.delete(check);
    }, WAIT + 50);
    return () => {
      window.clearTimeout(id);
      pending.delete(check);
      if (!pending.size) detach();
    };
  }, []);
  return [ref, forced];
}
