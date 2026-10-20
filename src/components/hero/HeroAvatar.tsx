"use client";
/**
 * ★ PIXAR AVATAR SLOT ★
 * Which image/video is shown is decided at build time by ./resolveAvatar.ts from ./avatar.config.ts.
 *   - Drop public/avatar/pixar-avatar.webp (or .png/.webm/.mp4) and rebuild → "primary" state:
 *     no blob mask, object-contain, character may overlap the ring.
 *   - Otherwise the cropped real photo is shown in the blob mask ("fallback" state).
 * See README.md → "Swapping the avatar".
 */
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { asset } from "@/lib/asset";
import { AVATAR } from "./avatar.config";
import type { ResolvedAvatar } from "./resolveAvatar";
import { avatarEnter } from "@/lib/motion";

const BADGES = [
  { label: "AWS Certified", cls: "-left-4 top-[14%] xl:-left-10" },
  { label: "14+ yrs", cls: "-right-2 top-[8%] xl:-right-8" },
  { label: "IBM Hackathon Winner", cls: "-right-6 bottom-[12%] xl:-right-14" },
];

export default function HeroAvatar({ avatar }: { avatar: ResolvedAvatar }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState<"primary" | "fallback">(avatar.isPrimary ? "primary" : "fallback");
  const [entered, setEntered] = useState(false);
  const [fine, setFine] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const inView = useInView(boxRef);

  // pointer parallax (desktop fine pointer only)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18 });
  const sy = useSpring(my, { stiffness: 120, damping: 18 });
  const rotY = useTransform(sx, [-0.5, 0.5], [-3, 3]);
  const rotX = useTransform(sy, [-0.5, 0.5], [3, -3]);
  const tx = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const ty = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  const glowX = useTransform(sx, [-0.5, 0.5], [20, -20]);
  const glowY = useTransform(sy, [-0.5, 0.5], [20, -20]);

  useEffect(() => {
    setFine(window.matchMedia("(pointer: fine)").matches);
    // image may have failed before hydration
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0 && avatar.isPrimary) setState("fallback");
  }, [avatar.isPrimary]);

  useEffect(() => {
    if (!fine || reduce) return;
    const move = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [fine, reduce, mx, my]);

  const isFallback = state === "fallback";
  const src = asset(isFallback ? AVATAR.fallbackSrc : avatar.src);
  const alt = isFallback ? AVATAR.fallbackAlt : AVATAR.alt;
  const running = inView && !reduce;
  const debug = process.env.NODE_ENV !== "production";

  return (
    <motion.div variants={avatarEnter} className="avatar-box relative mx-auto" onAnimationComplete={() => setEntered(true)}>
      <div ref={boxRef} className="relative h-full w-full" data-avatar-state={state}>
        {/* 1 glow */}
        <motion.div
          aria-hidden
          style={{ x: fine ? glowX : 0, y: fine ? glowY : 0 }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2"
        >
          <motion.div
            animate={running ? { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] } : undefined}
            transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
            className="h-full w-full bg-glow-hero opacity-90 blur-[40px] [will-change:transform]"
          />
        </motion.div>

        {/* 2 rings */}
        <div aria-hidden className="avatar-ring" />
        <div aria-hidden className="avatar-ring-dashed hidden lg:block" />

        <motion.div style={fine && !reduce ? { x: tx, y: ty, rotateX: rotY, rotateY: rotX } : undefined} className="absolute inset-0 [transform-style:preserve-3d]">
          <motion.div
            animate={entered && running ? { y: [0, -14, 0], rotate: [-0.6, 0.6, -0.6] } : { y: 0, rotate: 0 }}
            transition={entered && running ? { duration: 6, ease: "easeInOut", repeat: Infinity } : { duration: 0.3 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ rotate: [0, -6, 6, -3, 0], transition: { duration: 0.5 } }}
            className="relative h-full w-full cursor-pointer [will-change:transform]"
          >
            {/* 3 plate */}
            <div aria-hidden className={`avatar-plate absolute inset-0 bg-surface-2 ${isFallback ? "avatar-blob" : "avatar-blob-static"}`} />
            {/* 4 media */}
            {avatar.kind === "video" && !isFallback ? (
              <video
                className="avatar-media absolute inset-0 h-full w-full object-contain"
                src={asset(avatar.src)}
                poster={asset(AVATAR.fallbackSrc)}
                autoPlay={!reduce}
                loop
                muted
                playsInline
                aria-label={AVATAR.alt}
                onError={() => setState("fallback")}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={src}
                alt={alt}
                width={900}
                height={900}
                fetchPriority="high"
                decoding="async"
                onError={() => !isFallback && setState("fallback")}
                className={`avatar-media absolute inset-0 h-full w-full ${
                  isFallback ? "avatar-blob object-cover object-[50%_30%]" : "object-contain"
                }`}
              />
            )}
            {debug && (
              <div aria-hidden className="pointer-events-none absolute inset-0 rounded-lg border-2 border-dashed border-accent/70">
                <span className="absolute left-2 top-2 rounded-xs bg-bg/80 px-2 py-1 font-mono text-[11px] text-accent">
                  AVATAR SLOT · public/avatar/pixar-avatar.* ({state})
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* 5 badges (desktop, decorative) */}
        {BADGES.map((b, i) => (
          <motion.div
            key={b.label}
            aria-hidden
            animate={running ? { y: [0, -8, 0] } : undefined}
            transition={{ duration: 4.5 + i * 0.6, ease: "easeInOut", repeat: Infinity, delay: i * 1.2 }}
            className={`absolute hidden rounded-pill border border-line bg-surface/85 px-3 py-1.5 text-small shadow-md backdrop-blur lg:block ${b.cls}`}
          >
            {b.label}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

