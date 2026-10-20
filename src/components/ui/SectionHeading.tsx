import Reveal from "./Reveal";

export default function SectionHeading({ eyebrow, children, id }: { eyebrow: string; children: React.ReactNode; id?: string }) {
  return (
    <Reveal className="mb-12 max-w-3xl">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h2 id={id} className="text-h2">{children}</h2>
    </Reveal>
  );
}
