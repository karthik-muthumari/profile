"use client";
import { motion, useScroll, useSpring } from "framer-motion";

/** Reading progress bar fixed under the nav. */
export default function PostChrome() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX: x }}
      className="fixed inset-x-0 top-nav z-40 h-[3px] origin-left bg-grad-accent"
    />
  );
}
