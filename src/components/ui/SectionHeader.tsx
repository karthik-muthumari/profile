"use client";
import { motion } from "framer-motion";
import { dur, ease, fadeIn, viewport, wordReveal } from "@/lib/motion";

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
  const words = title.split(/\s+/).map((w) => {
    const m = w.match(/^\{(.+)\}([^\w]*)$/);
    return m ? { text: m[1] + m[2], accent: true } : { text: w, accent: false };
  });
  const plain = title.replace(/[{}]/g, "");

  return (
    <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} initial="hidden" whileInView="show" viewport={viewport} className="mb-10 max-w-3xl md:mb-14">
      <p className="eyebrow mb-4 flex items-center gap-3">
        <motion.span
          aria-hidden
          variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: dur.med, ease: ease.outExpo } } }}
          className="h-[2px] w-6 origin-left bg-grad-accent"
        />
        <motion.span variants={fadeIn} transition={{ delay: 0.1 }}>
          {index} — {eyebrow}
        </motion.span>
      </p>
      <Tag id={id} aria-label={plain} className="text-h2">
        {words.map((w, i) => (
          <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span custom={i} variants={wordReveal} className={`inline-block ${w.accent ? "font-serif font-normal italic" : ""}`}>
              {w.text}
            </motion.span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </Tag>
      {lead && (
        <motion.p variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.outExpo, delay: 0.25 } } }} className="mt-4 max-w-[56ch] text-lead text-fg-muted">
          {lead}
        </motion.p>
      )}
    </motion.div>
  );
}
