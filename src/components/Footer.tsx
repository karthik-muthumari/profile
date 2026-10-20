import Link from "next/link";
import { Github, Linkedin } from "@/components/ui/icons";
import { profile } from "../../content/resume";

const nav = [
  { href: "/", label: "Home" },
  { href: "/#experience", label: "Experience" },
  { href: "/#projects", label: "Projects" },
  { href: "/blog/", label: "Blog" },
  { href: "/#contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="relative z-[1] border-t border-line py-12">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-5">
            <p className="font-display text-h3">{profile.name}</p>
            <p className="mt-2 max-w-[40ch] text-fg-muted">{profile.role} building resilient, accessible platforms on AWS.</p>
          </div>
          <nav aria-label="Footer" className="lg:col-span-3">
            <p className="mb-3 text-micro uppercase text-fg-subtle">Explore</p>
            <ul className="space-y-1">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="inline-flex min-h-11 min-w-11 items-center text-fg-muted hover:text-accent">{n.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="lg:col-span-4">
            <h2 className="mb-3 text-micro uppercase text-fg-subtle">Contact</h2>
            <ul className="mb-4 space-y-1">
              {profile.emails.map((e) => (
                <li key={e.address}>
                  <a
                    href={`mailto:${e.address}`}
                    aria-label={`${e.aria}: ${e.address}`}
                    className="-mx-2 flex min-h-11 flex-col justify-center px-2 py-1 text-accent hover:text-accent-hi sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="shrink-0 text-micro uppercase text-fg-subtle sm:w-20">{e.label}</span>
                    <span className="font-mono text-mono [overflow-wrap:anywhere]">{e.address.split("@")[0]}@<wbr />{e.address.split("@")[1]}</span>
                  </a>
                </li>
              ))}
            </ul>
            <ul className="flex items-center gap-2">
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
                    <Icon size={18} strokeWidth={1.75} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-small text-fg-subtle sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {profile.name}</p>
          <p>Built with Next.js, deployed on GitHub Pages</p>
        </div>
      </div>
    </footer>
  );
}
