"use client";
import { useRef } from "react";
import { MOTION_TIERS, type MotionTier } from "@/lib/motion";
import { useMotionPrefs } from "./MotionPrefs";

const LABEL: Record<MotionTier, string> = { full: "Full", gentle: "Gentle", off: "Off" };
const HELP: Record<MotionTier, string> = {
  full: "All animations",
  gentle: "Soft fades only, no spinning or large movement",
  off: "No animation at all",
};

/** Footer segmented control (radiogroup) for the motion tier. Choice persists in localStorage['motion']. */
export default function MotionControl() {
  const { tier, auto, setTier } = useMotionPrefs();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const n = (i + dir + MOTION_TIERS.length) % MOTION_TIERS.length;
    setTier(MOTION_TIERS[n]);
    refs.current[n]?.focus();
  };

  return (
    <div className="mt-10 border-t border-line pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="motion-label" className="text-micro uppercase text-fg-subtle">Motion</p>
        <div role="radiogroup" aria-labelledby="motion-label" className="inline-flex w-full rounded-pill border border-line p-1 sm:w-auto">
          {MOTION_TIERS.map((t, i) => (
            <button
              key={t}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={tier === t}
              aria-label={`Motion: ${LABEL[t]} — ${HELP[t]}`}
              tabIndex={tier === t ? 0 : -1}
              onClick={() => setTier(t)}
              onKeyDown={(e) => onKey(e, i)}
              className={`inline-flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-pill px-4 text-small font-medium transition-colors sm:flex-none ${
                tier === t ? "bg-accent/15 text-accent-hi ring-1 ring-accent/60" : "text-fg-muted hover:text-fg"
              }`}
            >
              {LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      {auto && tier === "gentle" && (
        <p className="mt-3 text-small text-fg-subtle" role="status">
          Animations are reduced because your device asks for it.{" "}
          <button type="button" onClick={() => setTier("full")} className="inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:text-accent-hi hover:underline">
            Switch to Full →
          </button>
        </p>
      )}
    </div>
  );
}
