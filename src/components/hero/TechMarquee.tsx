const TECH = ["React", "Next.js", "Node.js", "GraphQL", "Apollo Federation", "AWS (Certified Solutions Architect)", "CDK", "Terraform", "Playwright"];

/**
 * CSS-only marquee (04 §7, design/07 §7.3). Two identical groups, each carrying its own trailing gap, inside a track
 * that translates exactly -50% → seamless loop. The second group is aria-hidden; gentle/off tiers and OS reduce-motion
 * hide it and show a static wrapped row (see globals.css).
 */
export default function TechMarquee() {
  return (
    <div className="marquee" aria-label="Core technologies">
      <div className="marquee-track">
        <ul className="marquee-group">
          {TECH.map((t) => (
            <li key={t} className="chip">{t}</li>
          ))}
        </ul>
        <ul className="marquee-group marquee-dup" aria-hidden>
          {TECH.map((t) => (
            <li key={`dup-${t}`} className="chip">{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
