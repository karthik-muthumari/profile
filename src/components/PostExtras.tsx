"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Link2 } from "lucide-react";
import type { TocItem } from "@/lib/posts";

export function CopyLink() {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setDone(true);
      window.setTimeout(() => setDone(false), 3000);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <>
      <button type="button" onClick={copy} className="btn-ghost h-11 px-4">
        <Link2 size={16} aria-hidden /> Copy link
      </button>
      <div role="status" aria-live="polite" className="sr-only">{done ? "Link copied" : ""}</div>
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            aria-hidden
            className="fixed bottom-6 left-1/2 z-[70] inline-flex -translate-x-1/2 items-center gap-2 rounded-pill border border-line-strong bg-surface-2 px-4 py-2 text-small shadow-lg"
          >
            <Check size={16} className="text-success" /> Link copied
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Sticky TOC, visible ≥1280px (right margin). */
export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const v = entries.find((e) => e.isIntersecting);
        if (v) setActive(v.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page" className="sticky top-28 hidden w-56 xl:block">
      <p className="mb-3 text-micro uppercase text-fg-subtle">On this page</p>
      <ul className="space-y-2 border-l border-line">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "location" : undefined}
              className={`-ml-px block border-l-2 py-1 pl-3 text-small transition-colors ${i.level === 3 ? "pl-6" : ""} ${
                active === i.id ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
