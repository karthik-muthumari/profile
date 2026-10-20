import { ArrowUpRight } from "lucide-react";
import { Github, Linkedin } from "@/components/ui/icons";
import { profile } from "../../../content/resume";
import Reveal from "../ui/Reveal";
import SectionHeader from "../ui/SectionHeader";
import ContactCard from "../ui/ContactCard";

export default function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="section-y">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-5 sm:p-8 lg:p-12">
          <div aria-hidden className="absolute inset-0 bg-glow-hero opacity-80" />
          <div className="relative grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-12 lg:items-center lg:gap-6">
            <div className="min-w-0 lg:col-span-5">
              <SectionHeader
                index="06"
                eyebrow="Contact"
                id="contact-title"
                title="Let's build {something} great"
                lead="Open to conversations about full-stack, cloud and AI-assisted engineering. Email is best."
              />
            </div>
            <div className="min-w-0 lg:col-span-6 lg:col-start-7">
              <ul aria-label="Email addresses" className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-1">
                {profile.emails.map((e, i) => (
                  <li key={e.id} className="min-w-0">
                    <Reveal delay={0.08 * (i + 1)}>
                      <ContactCard entry={e} primary={i === 0} />
                    </Reveal>
                  </li>
                ))}
              </ul>
              <Reveal delay={0.3}>
                <ul aria-label="Social links" className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
                  <li>
                    <a href={profile.github} target="_blank" rel="noopener noreferrer" aria-label="Karthik on GitHub (opens in new tab)" className="btn-ghost h-12 w-full sm:w-auto">
                      <Github size={18} /> GitHub <ArrowUpRight size={16} aria-hidden />
                    </a>
                  </li>
                  <li>
                    <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Karthik on LinkedIn (opens in new tab)" className="btn-ghost h-12 w-full sm:w-auto">
                      <Linkedin size={18} /> LinkedIn <ArrowUpRight size={16} aria-hidden />
                    </a>
                  </li>
                </ul>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
