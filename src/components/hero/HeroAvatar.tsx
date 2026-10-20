"use client";
/**
 * ★ PIXAR AVATAR SLOT ★
 * Which image/video is shown is decided at build time by ./resolveAvatar.ts from ./avatar.config.ts.
 *   - Drop public/avatar/pixar-avatar.webp (or .png/.webm/.mp4) and rebuild → "primary" state:
 *     no blob mask, object-contain, character may overlap the ring.
 *   - Otherwise the cropped real photo is shown in the blob mask ("fallback" state).
 * See README.md → "Swapping the avatar".
 *
 * iOS/WebKit-safe motion (design/07 §3.5–3.6): every endless loop (ring spin, badge float, avatar float, glow pulse)
 * is a CSS keyframe on transform/opacity only; no blur / mask / filter on moving layers, no static will-change.
 * Framer is used only for the one-off entrance, hover/tap (fine pointer) and pointer parallax (desktop).
 */
import { useEffect, useId, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { asset } from "@/lib/asset";
import { AVATAR } from "./avatar.config";
import type { ResolvedAvatar } from "./resolveAvatar";
import { useMotion } from "../MotionPrefs";

const BADGES = [
  { label: "AWS Certified", cls: "badge-aws", bd: "6s", bl: "-1s" },
  { label: "14+ yrs", cls: "badge-yrs", bd: "7.5s", bl: "-3.5s" },
  { label: "IBM Hackathon Winner", cls: "badge-ibm", bd: "9s", bl: "-6s" },
];

export default function HeroAvatar({ avatar }: { avatar: ResolvedAvatar }) {
  const m = useMotion();
  const { avatarEnter } = m;
  const full = m.tier === "full";
  const [state, setState] = useState<"primary" | "fallback">(avatar.isPrimary ? "primary" : "fallback");
  const [fine, setFine] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const inView = useInView(boxRef);
  const gid = "ring" + useId().replace(/\W/g, ""); // url(#id) must be a plain identifier
  const pointerFx = fine && full && !m.mobile; // 3D tilt / parallax only for a real mouse on desktop

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
    setFine(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    // image may have failed before hydration
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0 && avatar.isPrimary) setState("fallback");
  }, [avatar.isPrimary]);

  useEffect(() => {
    if (!pointerFx) return;
    const move = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [pointerFx, mx, my]);

  const isFallback = state === "fallback";
  const src = asset(isFallback ? AVATAR.fallbackSrc : avatar.src);
  const alt = isFallback ? AVATAR.fallbackAlt : AVATAR.alt;
  const debug = process.env.NODE_ENV !== "production";

  return (
    <motion.div variants={avatarEnter} className="avatar-box relative mx-auto">
      <div ref={boxRef} className={`relative h-full w-full ${inView ? "" : "avatar-paused"}`} data-avatar-state={state}>
        {/* 1 glow: already a soft radial gradient → no blur filter; opacity-only CSS pulse */}
        <motion.div
          aria-hidden
          style={{ x: pointerFx ? glowX : 0, y: pointerFx ? glowY : 0 }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2"
        >
          <div className="avatar-glow h-full w-full bg-glow-hero opacity-90" />
        </motion.div>

        {/* 2 rings: SVG stroke-gradient arc (no mask) + faint dashed CSS ring (≥640px) */}
        <svg aria-hidden viewBox="0 0 100 100" className="avatar-ring-svg">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--ring-a)" }} />
              <stop offset=".55" style={{ stopColor: "var(--ring-b)" }} />
              <stop offset="1" style={{ stopColor: "var(--ring-c)" }} />
            </linearGradient>
          </defs>
          <circle className="ring-track" cx="50" cy="50" r="48.5" fill="none" />
          <circle className="ring-arc" cx="50" cy="50" r="48.5" fill="none" stroke={`url(#${gid})`} strokeLinecap="round" strokeDasharray="220 84.7" />
        </svg>
        <div aria-hidden className="avatar-ring-dashed" />

        <motion.div
          style={pointerFx ? { x: tx, y: ty, rotateX: rotY, rotateY: rotX, transformStyle: "preserve-3d" } : undefined}
          className="absolute inset-0"
        >
          <div className="avatar-float h-full w-full">
            <motion.div
              whileHover={full && fine ? { scale: 1.03 } : undefined}
              whileTap={full ? { scale: 1.06, rotate: [0, -6, 6, -3, 0], transition: { duration: 0.5 } } : undefined}
              className="relative h-full w-full cursor-pointer"
            >
              {/* 3 plate */}
              <div aria-hidden className={`avatar-plate absolute inset-0 bg-surface-2 ${isFallback ? "avatar-blob" : "avatar-blob-static"}`} />
              {/* 4 media */}
              {avatar.kind === "video" && !isFallback ? (
                <video
                  className="avatar-media absolute inset-0 h-full w-full object-contain"
                  src={asset(avatar.src)}
                  poster={asset(AVATAR.fallbackSrc)}
                  autoPlay={full}
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
          </div>
        </motion.div>

        {/* 5 floating badges: every breakpoint, real content (not aria-hidden), CSS transform float */}
        <ul aria-label="Highlights" className="avatar-badges">
          {BADGES.map((b, i) => (
            <li key={b.label} className={`avatar-badge ${b.cls}`} style={{ ["--i" as string]: i }}>
              <span className="badge-float" style={{ ["--bd" as string]: b.bd, ["--bl" as string]: b.bl }}>
                <span aria-hidden className="badge-dot" />
                {b.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
