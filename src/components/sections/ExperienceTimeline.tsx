"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { experience, type Company, type Project } from "../../../content/resume";
import { ease, spring } from "@/lib/motion";
import { useFailsafe, useMotion } from "../MotionPrefs";
import { useMediaQuery } from "@/lib/useMediaQuery";
import SectionHeader from "../ui/SectionHeader";

function Dot({ size = 12 }: { size?: 12 | 16 }) {
  const s = size === 16 ? "h-4 w-4" : "h-3 w-3";
  const m = useMotion();
  const [ref, forced] = useFailsafe<HTMLSpanElement>();
  const still = m.tier === "off";
  return (
    <span ref={ref} aria-hidden className={`relative block ${s}`}>
      <span className={`absolute inset-0 rounded-full border-2 border-line-strong bg-bg`} />
      <motion.span
        initial={still ? false : { scale: m.tier === "gentle" ? 1 : 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        animate={forced ? { scale: 1, opacity: 1 } : undefined}
        viewport={m.vpDot}
        transition={m.tier === "gentle" ? { duration: 0.4 } : { type: "spring", stiffness: 500, damping: 18 }}
        className="absolute -inset-[2px] rounded-full bg-grad-accent shadow-glow"
      />
      {m.tier === "full" && (
        <motion.span
          initial={{ scale: 1, opacity: 0 }}
          whileInView={{ scale: [1, 2.2], opacity: [0.6, 0] }}
          viewport={m.vpDot}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 rounded-full border-2 border-accent"
        />
      )}
    </span>
  );
}

function ProjectCard({ p, side }: { p: Project; side: 1 | -1 }) {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const m = useMotion();
  const [aref, forced] = useFailsafe<HTMLElement>();
  const expandable = (p.highlights?.length ?? 0) > 0 || p.tech.length > 6;
  const visibleTech = open ? p.tech : p.tech.slice(0, 6);
  const hidden = p.tech.length - 6;
  const id = `${p.client}-${p.name}`.replace(/\W+/g, "-").toLowerCase();

  return (
    <motion.article
      ref={aref}
      variants={desktop ? m.slideX(side) : m.fadeUp}
      initial="hidden"
      whileInView="show"
      animate={forced ? "show" : undefined}
      viewport={m.mobile ? m.vpDot : m.vp}
      className="group relative rounded-lg border border-line bg-surface p-6 shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-accent/40 hover:shadow-md focus-within:border-accent/40 md:p-7"
    >
      <motion.div whileHover={m.fx.hover ? { y: -4 } : undefined} whileTap={m.fx.tap ? { y: -2 } : undefined} transition={spring.card} className="relative">
        <span aria-hidden className="absolute -left-6 inset-y-0 hidden w-[3px] origin-top scale-y-0 rounded-full bg-grad-accent transition-transform duration-300 group-hover:scale-y-100 md:-left-7 md:block" />
        <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <h4 className="text-h3 font-display">{p.client} <span className="text-fg-muted">— {p.name}</span></h4>
        </div>
        <p className="mb-1 text-micro uppercase text-accent">{p.sector}</p>
        <p className="mb-4 font-mono text-mono text-fg-subtle lg:hidden">{p.duration}</p>
        <p className="mb-3 font-medium">{p.role}</p>
        <p className={`text-fg-muted ${open ? "" : "line-clamp-3"}`}>{p.summary}</p>

        <AnimatePresence initial={false}>
          {open && p.highlights && (
            <motion.div
              id={`${id}-more`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: ease.inOut }}
              className="overflow-hidden"
            >
              <ul className="mt-4 list-disc space-y-2 pl-5 text-fg-muted marker:text-accent">
                {p.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies">
          {visibleTech.map((t) => (
            <li key={t} className="chip">{t}</li>
          ))}
          {!open && hidden > 0 && <li className="chip">+{hidden}</li>}
        </ul>

        {expandable && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-more`}
            onClick={() => setOpen((v) => !v)}
            className="mt-5 inline-flex min-h-11 items-center gap-1 text-small font-semibold text-accent hover:text-accent-hi"
          >
            {open ? "Show less" : "Read more"}
            <ChevronDown size={16} aria-hidden className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </motion.div>
    </motion.article>
  );
}

function EmployerNode({ c }: { c: Company }) {
  const present = /present/i.test(c.period);
  const m = useMotion();
  const [ref, forced] = useFailsafe<HTMLDivElement>();
  const shortDuration = c.duration.replace(/\byears?\b/, "yrs").replace(/\bmonths?\b/, "mo");
  return (
    <motion.div ref={ref} variants={m.scaleIn} initial="hidden" whileInView="show" animate={forced ? "show" : undefined} viewport={m.mobile ? m.vpDot : m.vp} className="relative lg:flex lg:justify-center">
      <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line-strong bg-surface p-4 pr-6 shadow-md lg:max-w-xl">
        <span aria-hidden className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-grad-accent font-display text-h4 font-bold text-accent-ink">
          {c.company[0]}
        </span>
        <div>
          <h3 className="text-h3">{c.company}</h3>
          <p className="text-fg-muted">{c.title}</p>
        </div>
        <p className="inline-flex flex-wrap items-center gap-x-2 rounded-pill bg-surface-2 px-3 py-1 font-mono text-mono text-fg-muted">
          {present && (
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
          )}
          <span className="whitespace-nowrap">{c.period}</span>
          <span aria-hidden>·</span>
          <span className="whitespace-nowrap">
            <span className="min-[480px]:hidden" aria-hidden>{shortDuration}</span>
            <span className="sr-only min-[480px]:not-sr-only">{c.duration}</span>
          </span>
        </p>
      </div>
      <p className="mt-3 max-w-prose text-fg-muted lg:hidden">{c.blurb}</p>
    </motion.div>
  );
}

export default function ExperienceTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const m = useMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: m.mobile ? ["start 90%", "end 50%"] : ["start 80%", "end 60%"] });
  const spring_ = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const staticLine = useMotionValue(1);
  // touch: bind progress directly (no spring: JS springs over late iOS scroll events look laggy)
  const scaleY = m.tier === "off" ? staticLine : m.mobile ? scrollYProgress : spring_;

  return (
    <section id="experience" aria-labelledby="experience-title" className="section-y">
      <div className="container-x">
        <SectionHeader
          index="01"
          eyebrow="Experience"
          id="experience-title"
          title="Fourteen years, {two} employers"
          lead="From hybrid mobile apps to multi-region fintech and event-driven retail platforms."
        />

        <div ref={ref} className="relative">
          {/* line + scroll-drawn progress */}
          <div aria-hidden className="absolute inset-y-0 left-[14px] w-[2px] bg-line lg:left-1/2 lg:-translate-x-1/2" />
          <motion.div
            aria-hidden
            style={{ scaleY, transformOrigin: "top" }}
            className="absolute inset-y-0 left-[14px] w-[2px] bg-grad-accent lg:left-1/2 lg:-translate-x-1/2"
          />

          <ol className="space-y-16">
            {experience.map((c) => (
              <li key={c.company}>
                <div className="relative pl-10 lg:pl-0">
                  <span className="absolute left-[8px] top-8 lg:left-1/2 lg:-translate-x-1/2"><Dot size={16} /></span>
                  <EmployerNode c={c} />
                </div>
                <ol className="mt-12 space-y-12">
                  {c.projects.map((p, i) => {
                    const side: 1 | -1 = i % 2 === 0 ? -1 : 1; // -1 = left card (slides in from left)
                    return (
                      <li key={p.name} className="relative pl-10 lg:grid lg:grid-cols-2 lg:gap-x-20 lg:pl-0">
                        <span className="absolute left-[8px] top-9 lg:left-1/2 lg:-translate-x-1/2"><Dot size={12} /></span>
                        <div className={side === -1 ? "lg:col-start-1" : "lg:col-start-2"}>
                          <ProjectCard p={p} side={side === -1 ? -1 : 1} />
                        </div>
                        {/* date label opposite the card (desktop) */}
                        <p
                          className={`hidden items-start pt-8 font-mono text-mono text-fg-subtle lg:row-start-1 lg:flex ${
                            side === -1 ? "lg:col-start-2" : "lg:col-start-1 lg:justify-end lg:text-right"
                          }`}
                        >
                          {p.duration}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

