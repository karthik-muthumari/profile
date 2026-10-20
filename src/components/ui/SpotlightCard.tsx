"use client";
import { useRef } from "react";
import { motion } from "framer-motion";

/** Card with hover lift + cursor-following accent spotlight (CSS vars --mx/--my). */
export default function SpotlightCard({
  children,
  className = "",
  featured = false,
}: {
  children: React.ReactNode;
  className?: string;
  featured?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group relative overflow-hidden rounded-md border border-line bg-surface shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-accent/40 focus-within:ring-2 focus-within:ring-focus ${
        featured ? "shadow-glow" : "hover:shadow-md"
      } ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(400px at var(--mx, 50%) var(--my, 50%), rgb(var(--c-accent) / .14), transparent 60%)" }}
      />
      <div className="relative flex h-full flex-col">{children}</div>
    </motion.div>
  );
}
