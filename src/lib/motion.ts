import type { Transition, Variants } from "framer-motion";

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
export const viewport = { once: true, amount: 0.2, margin: "0px 0px -80px 0px" } as const;
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
export const avatarEnter: Variants = {
  hidden: { opacity: 0, scale: 0.82, filter: "blur(14px)", rotate: -4 },
  show: { opacity: 1, scale: 1, filter: "blur(0px)", rotate: 0, transition: { ...spring.soft, delay: 0.15, filter: { duration: 0.7 } } },
};

export const card: Variants = {
  rest: { y: 0, scale: 1, transition: spring.card },
  hover: { y: -6, scale: 1.005, transition: spring.card },
  tap: { scale: 0.985, transition: { duration: dur.fast } },
};
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.outExpo } },
};
