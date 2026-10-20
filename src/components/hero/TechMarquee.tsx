const TECH = ["React", "Next.js", "Node.js", "GraphQL", "Apollo Federation", "AWS (Certified Solutions Architect)", "CDK", "Terraform", "Playwright"];

/** CSS-only marquee (04 §7). Duplicate list is aria-hidden; reduced motion → static wrapped row (see globals.css). */
export default function TechMarquee() {
  return (
    <div className="marquee" aria-label="Core technologies">
      <ul className="marquee-track">
        {TECH.map((t) => (
          <li key={t} className="chip">{t}</li>
        ))}
        {TECH.map((t) => (
          <li key={`dup-${t}`} className="chip marquee-dup" aria-hidden>{t}</li>
        ))}
      </ul>
    </div>
  );
}
