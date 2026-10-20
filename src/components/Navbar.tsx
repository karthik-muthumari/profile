"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import { profile } from "../../content/resume";
import { ease, spring } from "@/lib/motion";

const links = [
  { href: "/#about", label: "Home", key: "home" },
  { href: "/#experience", label: "Experience", key: "experience" },
  { href: "/#projects", label: "Projects", key: "projects" },
  { href: "/blog/", label: "Blog", key: "blog" },
];
const contact = { href: "/#contact", label: "Contact", key: "contact" };

// home-page section id -> nav key (scroll-spy)
const SPY: Record<string, string> = {
  about: "home",
  experience: "experience",
  skills: "experience",
  projects: "projects",
  blog: "blog",
  awards: "blog",
  contact: "contact",
};

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [spy, setSpy] = useState("home");
  const sheetRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  const active = pathname.startsWith("/blog") ? "blog" : isHome ? spy : "";

  // scroll-spy on the home page
  useEffect(() => {
    if (!isHome) return;
    const els = Object.keys(SPY).map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) setSpy(SPY[vis.target.id]);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.01, 0.5] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isHome]);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  // route change closes the sheet
  useEffect(() => setOpen(false), [pathname]);

  // scroll lock, inert background, Esc, focus trap
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const bg = Array.from(document.querySelectorAll<HTMLElement>("main, footer"));
    bg.forEach((el) => el.setAttribute("inert", ""));
    sheetRef.current?.querySelector<HTMLElement>("a")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;
      const nodes = [toggleRef.current, ...Array.from(sheetRef.current?.querySelectorAll<HTMLElement>("a, button") ?? [])].filter(Boolean) as HTMLElement[];
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      bg.forEach((el) => el.removeAttribute("inert"));
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-50 h-nav border-b border-line/60 transition-[background-color,box-shadow] duration-[250ms] [@media(hover:hover)_and_(min-width:1024px)]:backdrop-blur-xl ${
        scrolled || open ? "bg-bg/95 shadow-sm" : "bg-bg/90"
      }`}
    >
      <nav aria-label="Primary" className="mx-auto flex h-full w-full max-w-wide items-center justify-between px-gutter">
        <Link href="/" className="flex min-h-11 min-w-11 items-center gap-3" aria-label={`${profile.name} — home`}>
          <motion.span
            whileHover={{ rotate: -6 }}
            transition={spring.snappy}
            aria-hidden
            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-grad-accent font-display text-small font-bold text-accent-ink"
          >
            KM
          </motion.span>
          <span className="hidden font-display text-h4 font-semibold tracking-tight lg:inline">{profile.name}</span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const isActive = active === l.key;
            return (
              <li key={l.key} className="relative">
                {isActive && (
                  <motion.span layoutId="nav-pill" transition={spring.layout} aria-hidden className="absolute inset-0 rounded-pill bg-surface-2" />
                )}
                <Link
                  href={l.href}
                  aria-current={isActive && l.key === "blog" && pathname.startsWith("/blog") ? "page" : undefined}
                  className={`nav-link relative inline-flex min-h-11 items-center rounded-pill px-4 text-small font-medium ${isActive ? "text-fg" : "text-fg-muted hover:text-fg"}`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href={contact.href}
            className={`hidden h-11 items-center rounded-pill border px-4 text-small font-semibold transition-colors hover:bg-surface-2 md:inline-flex ${
              active === "contact" ? "border-accent text-accent" : "border-line-strong text-fg"
            }`}
          >
            Contact
          </Link>
          <ThemeToggle />
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-line-strong md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden className="relative block h-3.5 w-5">
              <motion.span animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} className="absolute left-0 top-0 h-[2px] w-5 rounded bg-current" />
              <motion.span animate={{ opacity: open ? 0 : 1 }} className="absolute left-0 top-[6px] h-[2px] w-5 rounded bg-current" />
              <motion.span animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="absolute bottom-0 left-0 h-[2px] w-5 rounded bg-current" />
            </span>
          </button>
        </div>
      </nav>
    </header>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={sheetRef}
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-0 bottom-0 top-nav z-[60] overflow-y-auto bg-bg md:hidden"
          >
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
              className="flex flex-col gap-4 px-gutter py-8"
            >
              {links.map((l) => (
                <motion.li key={l.key} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.outExpo } } }}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={active === l.key && l.key === "blog" ? "page" : undefined}
                    className={`block min-h-11 py-1 font-display text-h2 ${active === l.key ? "text-accent" : "text-fg"}`}
                  >
                    {l.label}
                  </Link>
                </motion.li>
              ))}
              <motion.li variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.outExpo } } }} className="mt-4">
                <Link href={contact.href} onClick={() => setOpen(false)} className="btn-primary h-12 w-full">
                  Contact
                </Link>
              </motion.li>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
