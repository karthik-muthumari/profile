"use client";
import { motion } from "framer-motion";
import { skillGroups } from "../../../content/resume";
import SectionHeader from "../ui/SectionHeader";
import Reveal from "../ui/Reveal";

export default function Skills() {
  return (
    <section id="skills" aria-labelledby="skills-title" className="section-y">
      <div className="container-x">
        <SectionHeader index="02" eyebrow="Skills" id="skills-title" title="A toolbox for {end-to-end} delivery" />
        <ul className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {skillGroups.map((g, i) => (
            <li key={g.group}>
              <Reveal delay={i * 0.06} className="card h-full p-6">
                <h3 className="mb-4 text-h4">{g.group}</h3>
                <ul className="flex flex-wrap gap-2">
                  {g.items.map((s) => (
                    <motion.li
                      key={s}
                      whileHover={{ y: -2 }}
                      className="chip cursor-default transition-colors hover:border-accent/50 hover:bg-accent/10 hover:text-fg"
                    >
                      {s}
                    </motion.li>
                  ))}
                </ul>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
