"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Check, Copy, Mail } from "lucide-react";
import { spring } from "@/lib/motion";
import { useMotion } from "../MotionPrefs";

export interface EmailEntry {
  id: string;
  label: string;
  address: string;
  aria: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** One email row: whole card is a mailto link (stretched ::after); copy button is a sibling above it. */
export default function ContactCard({ entry, primary = false }: { entry: EmailEntry; primary?: boolean }) {
  const { fx } = useMotion();
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<number | undefined>(undefined);
  const Icon = entry.id === "work" ? Briefcase : Mail;
  const noun = `${entry.label.toLowerCase()} email address`;

  const copy = async () => {
    const ok = await copyText(entry.address);
    setState(ok ? "ok" : "fail");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <motion.div
      whileHover={fx.hover ? { y: -2 } : undefined}
      whileTap={fx.tap ? { scale: 0.985 } : undefined}
      transition={spring.snappy}
      className={`group relative flex min-h-[64px] min-w-0 items-center gap-2 rounded-lg border bg-surface p-2.5 min-[360px]:gap-3 min-[360px]:p-3 transition-colors hover:border-accent/60 hover:bg-surface-2 has-[a:focus-visible]:outline has-[a:focus-visible]:outline-[3px] has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-focus ${
        primary ? "border-accent/40 shadow-glow" : "border-line"
      }`}
    >
      <span aria-hidden className="hidden h-10 w-10 shrink-0 items-center justify-center min-[360px]:inline-flex rounded-md bg-surface-2 text-accent transition-colors group-hover:bg-accent/10">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-micro uppercase text-fg-subtle">
          {entry.label}
          {primary && (
            <span className="rounded-pill bg-grad-accent px-2 py-0.5 text-micro text-accent-ink">
              <span aria-hidden>Preferred</span>
              <span className="sr-only">Preferred contact</span>
            </span>
          )}
        </p>
        <a
          href={`mailto:${entry.address}`}
          aria-label={`${entry.aria}: ${entry.address}`}
          className="block [overflow-wrap:anywhere] font-mono text-mono text-fg underline decoration-transparent decoration-1 underline-offset-4 transition-[text-decoration-color] duration-[250ms] after:absolute after:inset-0 after:rounded-lg after:content-[''] hover:decoration-accent focus-visible:outline-none"
        >
          {entry.address.split("@")[0]}@<wbr />{entry.address.split("@")[1]}
        </a>
      </div>
      <div className="relative z-10 flex shrink-0 items-center gap-2">
        <span aria-hidden className={`hidden text-small text-fg-muted transition-opacity duration-150 sm:inline ${state === "idle" ? "opacity-0" : "opacity-100"}`}>
          {state === "ok" ? "Copied" : state === "fail" ? "Copy failed" : ""}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${noun}`}
          className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-line-strong text-fg-muted transition-colors hover:bg-surface hover:text-fg active:scale-90"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={state === "ok" ? "ok" : "copy"}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.1 } }}
              transition={spring.snappy}
              className="inline-flex"
            >
              {state === "ok" ? <Check size={16} className="text-success" aria-hidden /> : <Copy size={16} aria-hidden />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "ok" ? `${entry.label} email copied to clipboard` : state === "fail" ? "Copy failed. Select the address manually." : ""}
      </span>
    </motion.div>
  );
}
