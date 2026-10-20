"use client";
import { useRef } from "react";
import { motion } from "framer-motion";
import { useMotion } from "../MotionPrefs";

/**
 * Card with hover lift + cursor-following accent spotlight (CSS vars --mx/--my).
 * Touch equivalent: pressing lights the spotlight at the touch point (data-pressed) and nudges the card up;
 * release springs back. Hover/tap lift only in the "full" motion tier.
 */
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
  const { fx } = useMotion();
  const aim = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") aim(e);
  };
  const press = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    aim(e);
    ref.current?.setAttribute("data-pressed", "1");
  };
  const release = () => ref.current?.removeAttribute("data-pressed");
  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      whileHover={fx.hover ? { y: -6 } : undefined}
      whileTap={fx.tap ? { y: -3, scale: 0.985 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group relative overflow-hidden rounded-md border border-line bg-surface shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-accent/40 active:border-accent/50 focus-within:ring-2 focus-within:ring-focus ${
        featured ? "shadow-glow" : "hover:shadow-md"
      } ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-data-[pressed=1]:opacity-100"
        style={{ background: "radial-gradient(400px at var(--mx, 50%) var(--my, 50%), rgb(var(--c-accent) / .14), transparent 60%)" }}
      />
      <div className="relative flex h-full flex-col">{children}</div>
    </motion.div>
  );
}
