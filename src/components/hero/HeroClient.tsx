"use client";
import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ChevronDown, Mail } from "lucide-react";
import { Github, Linkedin } from "@/components/ui/icons";
import { primaryEmail, profile } from "../../../content/resume";
import { dur, ease, fadeIn, fadeUpSm, heroContainer, wordReveal } from "@/lib/motion";
import HeroAvatar from "./HeroAvatar";
import TechMarquee from "./TechMarquee";
import type { ResolvedAvatar } from "./resolveAvatar";

const LINE1 = ["Hi,", "I'm", "Karthik"];
const LINE2 = [{ t: "Full-stack" }, { t: "engineer", accent: true }];

export default function HeroClient({ avatar }: { avatar: ResolvedAvatar }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const glowY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -24]);
  const avScale = useTransform(scrollYProgress, [0, 0.6], [1, reduce ? 1 : 0.94]);
  const avOpacity = useTransform(scrollYProgress, [0, 0.6], [1, reduce ? 1 : 0.6]);

  return (
    <section ref={ref} id="about" aria-label="Introduction" className="relative overflow-hidden md:min-h-[calc(100svh-var(--nav-h))]">
      {/* background: glow + masked grid */}
      <motion.div aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, ease: ease.inOut }} className="pointer-events-none absolute inset-0">
        <motion.div style={{ y: glowY }} className="absolute inset-0 bg-glow-hero [will-change:transform]" />
        <div className="hero-grid absolute inset-0" />
      </motion.div>

      <motion.div
        variants={heroContainer}
        initial="hidden"
        animate="show"
        className="container-x relative grid grid-cols-1 items-center gap-8 pb-16 pt-12 md:min-h-[calc(100svh-var(--nav-h))] md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-8 md:py-16 lg:grid-cols-12"
      >
        {/* avatar first on mobile */}
        <motion.div style={{ scale: avScale, opacity: avOpacity }} className="order-1 min-w-0 md:order-2 lg:col-span-5 lg:-mr-6">
          <HeroAvatar avatar={avatar} />
        </motion.div>

        <motion.div style={{ y: textY }} className="order-2 min-w-0 md:order-1 lg:col-span-7">
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
            variants={{ hidden: { opacity: 0, y: 16, filter: "blur(6px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: dur.slow, ease: ease.outExpo, delay: 0.3 } } }}
            className="mt-6 max-w-[52ch] text-lead text-fg-muted"
          >
            Fourteen years building resilient, accessible web platforms &mdash; React, Next.js, Node.js, GraphQL and serverless AWS &mdash; for retail, fintech and healthcare.
          </motion.p>

          <motion.div variants={heroContainer} className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <motion.div variants={fadeUpSm}>
              <motion.a whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} href="#projects" className="btn-primary h-12 w-full sm:w-auto">
                View my work <ArrowDown size={18} aria-hidden />
              </motion.a>
            </motion.div>
            <motion.div variants={fadeUpSm}>
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
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
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
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

          <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: dur.med, delay: 0.5 } } }} className="mt-10">
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
        transition={{ delay: 1.1 }}
        className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-micro uppercase text-fg-subtle md:flex"
      >
        Scroll
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
          <ChevronDown size={16} aria-hidden />
        </motion.span>
      </motion.a>
    </section>
  );
}
