"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { featuredProjects, type ProjectCategory } from "../../../content/resume";
import SpotlightCard from "../ui/SpotlightCard";
import SectionHeader from "../ui/SectionHeader";

const FILTERS: ("All" | ProjectCategory)[] = ["All", "Frontend", "Backend", "Cloud", "AI"];

export default function ProjectsGrid() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const list = filter === "All" ? featuredProjects : featuredProjects.filter((p) => p.categories.includes(filter));

  return (
    <section id="projects" aria-labelledby="projects-title" className="section-y">
      <div className="container-x">
        <SectionHeader
          index="03"
          eyebrow="Projects"
          id="projects-title"
          title={"Things I've {shipped}"}
          lead="Selected recent work. Client details are kept high-level."
        />
        <div role="group" aria-label="Filter projects" className="-mx-1 mb-8 flex snap-x gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`chip min-h-11 shrink-0 snap-start px-4 py-2 text-small transition-colors ${
                filter === f ? "!border-accent !bg-accent/15 !text-accent-hi" : "hover:border-line-strong hover:text-fg"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <motion.ul layout className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:gap-8">
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => (
              <motion.li
                key={p.slug}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className={p.featured && filter === "All" ? "lg:col-span-2" : ""}
              >
                <SpotlightCard featured={p.featured} className="h-full">
                  <div aria-hidden className="relative flex aspect-video items-center justify-center overflow-hidden bg-surface-2">
                    <div className="absolute inset-0 bg-glow-hero opacity-80 transition-transform duration-500 group-hover:scale-105" />
                    <span className="relative font-display text-[4.5rem] font-bold leading-none text-gradient transition-transform duration-500 group-hover:scale-105">
                      {p.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <ul className="mb-3 flex flex-wrap gap-x-3 gap-y-1" aria-label="Categories">
                      {p.categories.map((c) => (
                        <li key={c} className="text-micro uppercase text-fg-subtle">{c}</li>
                      ))}
                    </ul>
                    <h3 className="mb-1 text-h3">{p.name}</h3>
                    <p className="mb-2 text-small text-accent">{p.client}</p>
                    <p className="mb-5 line-clamp-3 text-fg-muted">{p.summary}</p>
                    <div className="mt-auto flex items-end justify-between gap-4">
                      <ul className="flex flex-wrap gap-2">
                        {p.tech.slice(0, 4).map((t) => (
                          <li key={t} className="chip">{t}</li>
                        ))}
                      </ul>
                      {(p.href || p.repo) && (
                        <a
                          href={p.href ?? p.repo}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${p.name}`}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-line-strong text-accent after:absolute after:inset-0 after:content-['']"
                        >
                          <ArrowUpRight size={18} className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden />
                        </a>
                      )}
                    </div>
                  </div>
                </SpotlightCard>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </div>
    </section>
  );
}
