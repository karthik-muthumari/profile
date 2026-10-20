"use client";
import { motion } from "framer-motion";
import { pageVariants } from "@/lib/motion";

/** Re-mounts on every navigation → enter animation (exit omitted by design; see design/04 §10).
 *  Reduced motion: MotionConfig drops the y offset; opacity-only fade remains. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="enter">
      {children}
    </motion.div>
  );
}
