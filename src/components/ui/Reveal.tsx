"use client";
import { useMemo } from "react";
import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import { dur, ease, fadeUp, viewport } from "@/lib/motion";

/**
 * Scroll-triggered fadeUp entrance (04 §2). Reduced motion is handled globally by
 * <MotionConfig reducedMotion="user"> (transforms off, opacity kept).
 * SSR renders the content; `hidden` styles are applied by the client only.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
  ...rest
}: { delay?: number } & HTMLMotionProps<"div">) {
  const variants = useMemo<Variants>(
    () => ({
      hidden: fadeUp.hidden,
      show: { ...(fadeUp.show as object), transition: { duration: dur.slow, ease: ease.outExpo, delay } },
    }),
    [delay],
  );
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
