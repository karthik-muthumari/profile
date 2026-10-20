import { Award, GraduationCap, Languages, Trophy } from "lucide-react";
import { awards, education, languages } from "../../../content/resume";
import SectionHeader from "../ui/SectionHeader";
import Reveal from "../ui/Reveal";

export default function Awards() {
  return (
    <section id="awards" aria-labelledby="awards-title" className="section-y">
      <div className="container-x">
        <SectionHeader index="05" eyebrow="Recognition" id="awards-title" title="Awards & {education}" />
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Reveal className="card p-6 md:p-8">
            <h3 className="mb-6 text-h4">Awards &amp; certifications</h3>
            <ul className="space-y-6">
              {awards.map((a, i) => (
                <li key={a.title} className="flex gap-4">
                  <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-grad-accent text-accent-ink" aria-hidden>
                    {i === 0 ? <Award size={18} /> : <Trophy size={18} />}
                  </span>
                  <div>
                    <p className="font-display text-h4">{a.title}</p>
                    <p className="font-mono text-mono text-fg-subtle">{a.year}</p>
                    <p className="mt-1 text-fg-muted">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="card p-6 md:p-8">
            <h3 className="mb-6 text-h4">Education &amp; languages</h3>
            <div className="mb-6 flex gap-4">
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-accent" aria-hidden>
                <GraduationCap size={18} />
              </span>
              <div>
                <p className="font-display text-h4">{education.degree}</p>
                <p className="font-mono text-mono text-fg-subtle">{education.year}</p>
                <p className="mt-1 text-fg-muted">{education.school}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-accent" aria-hidden>
                <Languages size={18} />
              </span>
              <div>
                <p className="font-display text-h4">Languages</p>
                <p className="mt-1 text-fg-muted">{languages.join(" · ")}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
