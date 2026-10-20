import Link from "next/link";
import { Github, Linkedin } from "@/components/ui/icons";
import { profile } from "../../content/resume";
import MotionControl from "./MotionControl";

const nav = [
  { href: "/", label: "Home" },
  { href: "/#experience", label: "Experience" },
  { href: "/#projects", label: "Projects" },
  { href: "/blog/", label: "Blog" },
  { href: "/#contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="relative z-[1] border-t border-line py-12 md:py-16">
      <div className="container-x">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-6">
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="font-display text-h3">{profile.name}</p>
            <p className="mt-2 max-w-[40ch] text-fg-muted">{profile.role} building resilient, accessible platforms on AWS.</p>
          </div>
          <nav aria-label="Footer" className="lg:col-span-3 lg:col-start-5">
            <p className="mb-3 text-micro uppercase text-fg-subtle">Explore</p>
            <ul className="flex flex-wrap gap-x-5 sm:flex-col sm:gap-x-0">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="inline-flex min-h-11 min-w-11 items-center text-fg-muted hover:text-accent">{n.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-w-0 lg:col-span-5">
            <h2 className="mb-3 text-micro uppercase text-fg-subtle">Contact</h2>
            <ul className="space-y-1">
              {profile.emails.map((e) => (
                <li key={e.address}>
                  {/* Left-aligned grid: label above address <1024; fixed 5rem label column ≥1024 so every address starts at the same x. */}
                  <a
                    href={`mailto:${e.address}`}
                    aria-label={`${e.aria}: ${e.address}`}
                    className="-mx-2 grid min-h-11 grid-cols-1 content-center items-baseline gap-x-3 px-2 py-1 text-left text-accent hover:text-accent-hi lg:grid-cols-[5rem_minmax(0,1fr)]"
                  >
                    <span className="mb-0.5 text-micro uppercase text-fg-subtle lg:mb-0">{e.label}</span>
                    <span className="font-mono text-mono [overflow-wrap:anywhere]">{e.address.split("@")[0]}@<wbr />{e.address.split("@")[1]}</span>
                  </a>
                </li>
              ))}
            </ul>
            <ul className="mt-5 flex gap-3">
              {[
                { href: profile.github, label: "Karthik on GitHub (opens in new tab)", Icon: Github },
                { href: profile.linkedin, label: "Karthik on LinkedIn (opens in new tab)", Icon: Linkedin },
              ].map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-accent"
                  >
                    <Icon size={20} strokeWidth={1.75} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <MotionControl />
        <div className="mt-6 flex flex-col gap-2 border-t border-line pb-20 pt-6 text-small text-fg-subtle sm:flex-row sm:items-baseline sm:justify-between sm:pb-0 sm:pr-16">
          <p>© {new Date().getFullYear()} {profile.name}</p>
          <p>Built with Next.js, deployed on GitHub Pages</p>
        </div>
      </div>
    </footer>
  );
}
