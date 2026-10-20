import type { Transition, Variant, Variants } from "framer-motion";

type Bezier = [number, number, number, number];

export const ease = {
  outExpo: [0.16, 1, 0.3, 1] as Bezier, // entrances
  inOut: [0.65, 0, 0.35, 1] as Bezier, // theme / layout
  out: [0.22, 1, 0.36, 1] as Bezier, // hover
};
export const dur = { fast: 0.15, base: 0.28, med: 0.5, slow: 0.7, hero: 0.9 };
export const spring: Record<"soft" | "snappy" | "card" | "layout", Transition> = {
  soft: { type: "spring", stiffness: 120, damping: 16, mass: 0.9 },
  snappy: { type: "spring", stiffness: 380, damping: 28 },
  card: { type: "spring", stiffness: 300, damping: 24 },
  layout: { type: "spring", stiffness: 400, damping: 36 },
};
export const stagger = { tight: 0.05, base: 0.08, loose: 0.12 };
// `amount: "some"` = fire as soon as ANY pixel enters the (inset) viewport. A fractional amount (e.g. 0.2)
// can never be satisfied by very tall blocks on short phone screens, leaving them stuck at opacity 0.
export const viewport = { once: true, amount: "some", margin: "0px 0px -48px 0px" } as const;
export const viewportSmall = { once: true, amount: 0.6 } as const;

export const sectionContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: stagger.base, delayChildren: 0.05 } },
};
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.outExpo } },
};
export const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.outExpo } },
};
export const fadeIn: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: dur.med } } };
export const scaleIn: Variants = { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: spring.soft } };
export const slideX = (dir: 1 | -1): Variants => ({
  hidden: { opacity: 0, x: 48 * dir },
  show: { opacity: 1, x: 0, transition: { duration: dur.slow, ease: ease.outExpo } },
});
export const wordReveal: Variants = {
  hidden: { y: "110%", opacity: 0 },
  show: (i: number) => ({ y: "0%", opacity: 1, transition: { duration: 0.7, ease: ease.outExpo, delay: i * 0.06 } }),
};

export const heroContainer: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };

export const card: Variants = {
  rest: { y: 0, scale: 1, transition: spring.card },
  hover: { y: -6, scale: 1.005, transition: spring.card },
  tap: { scale: 0.985, transition: { duration: dur.fast } },
};
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.outExpo } },
};

/* ------------------------------------------------------------------ */
/* Motion tiers (design/07 §3): full | gentle | off  ×  desktop | mobile */
/* ------------------------------------------------------------------ */
export type MotionTier = "full" | "gentle" | "off";
export const MOTION_TIERS: MotionTier[] = ["full", "gentle", "off"];

export interface MotionSet {
  tier: MotionTier;
  mobile: boolean;
  /** viewport options for whileInView (once, any pixel visible, small bottom inset). */
  vp: { once: true; amount: "some"; margin: string };
  /** timeline dots/cards fire a bit earlier on phones. */
  vpDot: { once: true; amount: "some"; margin: string };
  fadeUp: Variants;
  fadeUpSm: Variants;
  fadeIn: Variants;
  scaleIn: Variants;
  slideX: (dir: 1 | -1) => Variants;
  wordReveal: Variants;
  heroContainer: Variants;
  avatarEnter: Variants;
  /** section header children stagger */
  headerStagger: Variants;
  /** hover/tap/ambient effects permitted? */
  fx: { hover: boolean; tap: boolean; ambient: boolean; parallax: boolean };
}

const instant = { duration: 0 };
const mk = (hidden: Variant, show: Variant, transition?: Transition): Variants => ({
  hidden,
  show: { ...show, transition: transition ?? instant },
});

export function buildMotion(tier: MotionTier, mobile: boolean): MotionSet {
  const base = { tier, mobile };
  const vp = { once: true, amount: "some", margin: mobile ? "0px 0px -8% 0px" : "0px 0px -48px 0px" } as const;
  const vpDot = { once: true, amount: "some", margin: mobile ? "0px 0px -20% 0px" : "0px 0px -35% 0px" } as const;

  if (tier === "off") {
    const still = mk({ opacity: 1 }, { opacity: 1 });
    return {
      ...base, vp, vpDot,
      fadeUp: still, fadeUpSm: still, fadeIn: still, scaleIn: still,
      slideX: () => still,
      wordReveal: { hidden: { opacity: 1, y: "0%" }, show: { opacity: 1, y: "0%", transition: instant } },
      heroContainer: { hidden: {}, show: {} },
      avatarEnter: still,
      headerStagger: { hidden: {}, show: {} },
      fx: { hover: false, tap: false, ambient: false, parallax: false },
    };
  }

  if (tier === "gentle") {
    // ≤12px translate + opacity only; no scale / blur / rotate; stagger ≤ 0.04.
    const t = { duration: 0.4, ease: ease.outExpo };
    const up = mk({ opacity: 0, y: 12 }, { opacity: 1, y: 0 }, t);
    return {
      ...base, vp, vpDot,
      fadeUp: up, fadeUpSm: up, scaleIn: up,
      fadeIn: mk({ opacity: 0 }, { opacity: 1 }, t),
      slideX: () => up,
      wordReveal: {
        hidden: { opacity: 0 },
        show: (i: number) => ({ opacity: 1, transition: { duration: 0.4, ease: ease.outExpo, delay: Math.min(i, 4) * 0.04 } }),
      },
      heroContainer: { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } },
      avatarEnter: mk({ opacity: 0, y: 12 }, { opacity: 1, y: 0 }, { duration: 0.5, ease: ease.outExpo }),
      headerStagger: { hidden: {}, show: { transition: { staggerChildren: 0.04 } } },
      fx: { hover: false, tap: false, ambient: true, parallax: false },
    };
  }

  // full. Hidden/show KEYS and VALUES are identical on phones and desktop (only durations/stagger differ), so a
  // breakpoint change after hydration can never leave an element parked at a stale initial transform.
  const dd = mobile ? 0.45 : dur.slow;
  const t = { duration: dd, ease: ease.outExpo };
  return {
    ...base, vp, vpDot,
    fadeUp: mk({ opacity: 0, y: 14 }, { opacity: 1, y: 0 }, t),
    fadeUpSm: mk({ opacity: 0, y: 10 }, { opacity: 1, y: 0 }, t),
    fadeIn: fadeIn,
    scaleIn: mk({ opacity: 0, scale: 0.96, y: 10 }, { opacity: 1, scale: 1, y: 0 }, mobile ? t : spring.soft),
    slideX: (dir) => mk({ opacity: 0, x: 32 * dir, y: 0 }, { opacity: 1, x: 0, y: 0 }, t),
    wordReveal: {
      hidden: { y: "110%", opacity: 0 },
      show: (i: number) => ({ y: "0%", opacity: 1, transition: { duration: mobile ? 0.45 : 0.7, ease: ease.outExpo, delay: Math.min(i, 5) * (mobile ? 0.05 : 0.06) } }),
    },
    heroContainer: { hidden: {}, show: { transition: { staggerChildren: mobile ? 0.05 : 0.12, delayChildren: mobile ? 0.02 : 0.1 } } },
    // no blur / rotate: filter animation is expensive and unreliable on WebKit
    avatarEnter: mk({ opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1 }, { ...spring.soft, delay: mobile ? 0.03 : 0.15 }),
    headerStagger: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
    fx: { hover: !mobile, tap: true, ambient: true, parallax: !mobile },
  };
}
