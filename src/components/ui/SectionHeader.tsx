"use client";
import { motion } from "framer-motion";
import { dur, ease } from "@/lib/motion";
import { useFailsafe, useMotion } from "../MotionPrefs";

/**
 * Shared section header (03 §3.3): eyebrow with grow-in accent bar → H2 with word-by-word reveal →
 * optional lead. In `title`, wrap ONE word in {braces} to set it in Instrument Serif italic.
 * The full heading is exposed via aria-label; split spans are aria-hidden.
 */
export default function SectionHeader({
  index,
  eyebrow,
  title,
  lead,
  id,
  as: Tag = "h2",
}: {
  index: string;
  eyebrow: string;
  title: string;
  lead?: string;
  id?: string;
  as?: "h1" | "h2";
}) {
  const m = useMotion();
  const [ref, forced] = useFailsafe<HTMLDivElement>();
  const off = m.tier === "off";
  const words = title.split(/\s+/).map((w) => {
    const m = w.match(/^\{(.+)\}([^\w]*)$/);
    return m ? { text: m[1] + m[2], accent: true } : { text: w, accent: false };
  });
  const plain = title.replace(/[{}]/g, "");

  return (
    <motion.div ref={ref} variants={m.headerStagger} initial="hidden" whileInView="show" animate={forced ? "show" : undefined} viewport={m.vp} className="mb-10 max-w-3xl md:mb-14">
      <p className="eyebrow mb-4 flex items-center gap-3">
        <motion.span
          aria-hidden
          variants={{ hidden: { scaleX: off ? 1 : 0 }, show: { scaleX: 1, transition: off ? { duration: 0 } : { duration: dur.med, ease: ease.outExpo } } }}
          className="h-[2px] w-6 origin-left bg-grad-accent"
        />
        <motion.span variants={m.fadeIn} transition={off ? undefined : { delay: 0.1 }}>
          {index} — {eyebrow}
        </motion.span>
      </p>
      <Tag id={id} aria-label={plain} className="text-h2">
        {words.map((w, i) => (
          <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span custom={i} variants={m.wordReveal} className={`inline-block ${w.accent ? "font-serif font-normal italic" : ""}`}>
              {w.text}
            </motion.span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </Tag>
      {lead && (
        <motion.p variants={{ hidden: off ? { opacity: 1 } : { opacity: 0, y: m.tier === "gentle" ? 8 : 12 }, show: { opacity: 1, y: 0, transition: off ? { duration: 0 } : { duration: m.mobile ? 0.45 : dur.slow, ease: ease.outExpo, delay: m.mobile ? 0.12 : 0.25 } } }} className="mt-4 max-w-[56ch] text-lead text-fg-muted">
          {lead}
        </motion.p>
      )}
    </motion.div>
  );
}
