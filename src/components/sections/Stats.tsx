"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { Award, Building2, Cloud, Trophy } from "lucide-react";
import Reveal from "../ui/Reveal";

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(to) // SSR/no-JS shows the final value; animation restarts from 0 when scrolled into view;
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setN(to); return; }
    const c = animate(0, to, { duration: 1.2, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, reduce, to]);
  return <span ref={ref} className="tabular-nums">{n}{suffix}</span>;
}

const tiles = [
  { Icon: Cloud, node: <CountUp to={14} suffix="+" />, label: "Years building for the web" },
  { Icon: Building2, node: <CountUp to={2} />, label: "Employers, 6 client brands" },
  { Icon: Award, node: <span>AWS</span>, label: "Certified Solutions Architect" },
  { Icon: Trophy, node: <span>IBM</span>, label: "Hackathon winner, 2017" },
];

export default function Stats() {
  return (
    <section aria-label="At a glance" className="pb-section">
      <div className="container-x">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {tiles.map(({ Icon, node, label }, i) => (
            <li key={label}>
              <Reveal delay={i * 0.08} className="card h-full p-5">
                <Icon size={20} strokeWidth={1.75} className="mb-3 text-accent" aria-hidden />
                <p className="font-display text-h2 font-bold text-gradient">{node}</p>
                <p className="mt-1 text-small text-fg-muted">{label}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
