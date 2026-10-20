import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="container-x flex min-h-[70vh] flex-col items-start justify-center gap-6 py-section">
      <p className="eyebrow">Error</p>
      <h1 className="text-display"><span className="text-gradient">404</span></h1>
      <p className="max-w-[52ch] text-lead text-fg-muted">
        This page wandered off. It may have moved, or the link might be mistyped.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className="btn-primary h-12">Back home</Link>
        <Link href="/blog/" className="btn-ghost h-12">Read the blog</Link>
      </div>
    </section>
  );
}
