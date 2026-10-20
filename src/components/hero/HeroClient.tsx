"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ChevronDown, Mail } from "lucide-react";
import { Github, Linkedin } from "@/components/ui/icons";
import { primaryEmail, profile } from "../../../content/resume";
import { dur, ease } from "@/lib/motion";
import { useMotion } from "../MotionPrefs";
import HeroAvatar from "./HeroAvatar";
import TechMarquee from "./TechMarquee";
import type { ResolvedAvatar } from "./resolveAvatar";

/**
 * The entrance must play while the page is actually on screen. Pages opened from Messages / Mail / LinkedIn, restored
 * tabs and bfcache restores hydrate in the background; Framer is wall-clock based, so the sequence would already be over
 * when the user sees it. Gate on: tab visible + avatar image decoded + two animation frames; never wait > 1.5 s.
 */
function useEntranceReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const go = () => {
      if (done || document.visibilityState !== "visible") return;
      done = true;
      requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    };
    const img = document.querySelector<HTMLImageElement>("[data-avatar-state] img");
    (img && img.decode ? img.decode().catch(() => undefined) : Promise.resolve()).then(go);
    const t = window.setTimeout(go, 1500);
    document.addEventListener("visibilitychange", go);
    window.addEventListener("pageshow", go);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", go);
      window.removeEventListener("pageshow", go);
    };
  }, []);
  return ready;
}

const LINE1 = ["Hi,", "I'm", "Karthik"];
const LINE2 = [{ t: "Full-stack" }, { t: "engineer", accent: true }];

export default function HeroClient({ avatar }: { avatar: ResolvedAvatar }) {
  const ref = useRef<HTMLElement>(null);
  const m = useMotion();
  const { fadeIn, fadeUpSm, heroContainer, wordReveal } = m;
  const ready = useEntranceReady();
  // Scroll-linked values only for a desktop mouse in the full tier: on iOS scroll events are late/throttled and
  // every value is a main-thread style write (stutter, half-dimmed avatar).
  const par = m.fx.parallax ? 1 : 0;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -40 * par]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -24 * par]);
  const avScale = useTransform(scrollYProgress, [0, 0.6], [1, par ? 0.94 : 1]);
  const avOpacity = useTransform(scrollYProgress, [0, 0.6], [1, par ? 0.6 : 1]);

  // no filter:blur here (expensive / unreliable on WebKit); opacity + small y only. Delay kept short (hero ≤ ~1s on touch).
  const leadVariants =
    m.tier === "off"
      ? m.fadeUpSm
      : { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: m.mobile ? 0.45 : dur.slow, ease: ease.outExpo, delay: m.mobile ? 0.15 : 0.3 } } };
  const tailVariants = { hidden: { opacity: m.tier === "off" ? 1 : 0 }, show: { opacity: 1, transition: { duration: m.tier === "off" ? 0 : dur.med, delay: m.mobile ? 0.15 : 0.5 } } };

  return (
    <section ref={ref} id="about" aria-label="Introduction" className="relative overflow-hidden md:min-h-[calc(100svh-var(--nav-h))]">
      {/* background: glow + masked grid */}
      <motion.div aria-hidden initial={{ opacity: m.tier === "off" ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: m.tier === "off" ? 0 : m.mobile ? 0.5 : 1.2, ease: ease.inOut }} className="pointer-events-none absolute inset-0">
        <motion.div style={par ? { y: glowY } : undefined} className="hero-glow absolute inset-x-0 -bottom-12 -top-12" />
        <div className="hero-grid absolute inset-0" />
      </motion.div>

      <motion.div
        variants={heroContainer}
        initial="hidden"
        animate={ready ? "show" : "hidden"}
        className="container-x relative grid grid-cols-1 items-center gap-8 pb-16 pt-12 md:min-h-[calc(100svh-var(--nav-h))] md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-8 md:py-16 lg:grid-cols-12"
      >
        {/* avatar first on mobile */}
        <motion.div style={par ? { scale: avScale, opacity: avOpacity } : undefined} className="order-1 min-w-0 md:order-2 lg:col-span-5 lg:-mr-6">
          <HeroAvatar avatar={avatar} />
        </motion.div>

        <motion.div style={par ? { y: textY } : undefined} className="order-2 min-w-0 md:order-1 lg:col-span-7">
          <motion.p variants={fadeUpSm} className="mb-6 inline-flex items-center gap-2 rounded-pill border border-line bg-surface/80 px-3 py-1.5 text-micro uppercase text-fg-muted">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Open to interesting problems
          </motion.p>

          <h1 aria-label="Hi, I'm Karthik. Full-stack engineer." className="text-display md:text-[3.25rem] lg:text-[clamp(3.5rem,1.2rem+4.3vw,5.25rem)]">
            <span aria-hidden className="block">
              {LINE1.map((w, i) => (
                <span key={w} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                  <motion.span custom={i} variants={wordReveal} className="inline-block">{w}</motion.span>
                  {" "}
                </span>
              ))}
            </span>
            <span aria-hidden className="block">
              {LINE2.map((w, i) => (
                <span key={w.t} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                  <motion.span
                    custom={i + 3}
                    variants={wordReveal}
                    className={`inline-block ${w.accent ? "text-gradient font-serif font-normal italic" : ""}`}
                  >
                    {w.t}
                  </motion.span>
                  {i < LINE2.length - 1 ? " " : ""}
                </span>
              ))}
            </span>
          </h1>

          <motion.p
            variants={leadVariants}
            className="mt-6 max-w-[52ch] text-lead text-fg-muted"
          >
            Fourteen years building resilient, accessible web platforms &mdash; React, Next.js, Node.js, GraphQL and serverless AWS &mdash; for retail, fintech and healthcare.
          </motion.p>

          <motion.div variants={heroContainer} className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <motion.div variants={fadeUpSm}>
              <motion.a whileHover={m.fx.hover ? { y: -2 } : undefined} whileTap={{ scale: m.tier === "off" ? 1 : 0.97 }} href="#projects" className="btn-primary h-12 w-full sm:w-auto">
                View my work <ArrowDown size={18} aria-hidden />
              </motion.a>
            </motion.div>
            <motion.div variants={fadeUpSm}>
              <motion.div whileHover={m.fx.hover ? { y: -2 } : undefined} whileTap={{ scale: m.tier === "off" ? 1 : 0.97 }}>
                <Link href="/blog/" className="btn-ghost h-12 w-full hover:border-accent/60 sm:w-auto">Read the blog</Link>
              </motion.div>
            </motion.div>
            <motion.ul variants={fadeUpSm} className="flex items-center gap-1 sm:ml-2" aria-label="Social links">
              {[
                { href: profile.github, label: "Karthik on GitHub (opens in new tab)", Icon: Github, ext: true },
                { href: profile.linkedin, label: "Karthik on LinkedIn (opens in new tab)", Icon: Linkedin, ext: true },
                { href: `mailto:${primaryEmail}`, label: profile.emails[0].aria, Icon: Mail, ext: false },
              ].map(({ href, label, Icon, ext }) => (
                <li key={label}>
                  <motion.a
                    whileHover={m.fx.hover ? { scale: 1.08 } : undefined}
                    whileTap={{ scale: m.tier === "off" ? 1 : 0.92 }}
                    href={href}
                    aria-label={label}
                    {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-pill text-fg-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <Icon size={20} strokeWidth={1.75} aria-hidden />
                  </motion.a>
                </li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div variants={tailVariants} className="mt-10">
            <TechMarquee />
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.a
        href="#experience"
        aria-label="Scroll to experience"
        variants={fadeIn}
        initial="hidden"
        animate="show"
        transition={{ delay: m.tier === "off" ? 0 : 1.1 }}
        className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-micro uppercase text-fg-subtle md:flex"
      >
        Scroll
        <motion.span animate={m.fx.ambient && m.tier === "full" ? { y: [0, 6, 0] } : undefined} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
          <ChevronDown size={16} aria-hidden />
        </motion.span>
      </motion.a>
    </section>
  );
}
