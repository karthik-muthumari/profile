"use client";
import { useMemo } from "react";
import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import { dur, ease } from "@/lib/motion";
import { useFailsafe, useMotion } from "../MotionPrefs";

/**
 * Scroll-triggered fadeUp entrance (04 §2). Amplitude/duration come from the active motion tier + breakpoint
 * (see MotionPrefs / buildMotion). A failsafe force-reveals anything on screen that IntersectionObserver missed.
 * SSR renders the content; `hidden` styles are applied by the client only.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
  ...rest
}: { delay?: number } & HTMLMotionProps<"div">) {
  const m = useMotion();
  const [ref, forced] = useFailsafe<HTMLDivElement>();
  const variants = useMemo<Variants>(() => {
    const show = m.fadeUp.show as { transition?: { duration?: number; ease?: unknown } } & object;
    const d = m.tier === "off" ? 0 : Math.min(delay, m.mobile ? 0.15 : delay);
    return {
      hidden: m.fadeUp.hidden,
      show: { ...show, transition: { duration: show.transition?.duration ?? dur.slow, ease: ease.outExpo, delay: d } },
    };
  }, [m, delay]);
  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      whileInView="show"
      animate={forced ? "show" : undefined}
      viewport={m.vp}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
