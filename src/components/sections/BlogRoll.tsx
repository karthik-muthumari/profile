"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PostMeta } from "@/lib/posts";
import SpotlightCard from "../ui/SpotlightCard";
import Reveal from "../ui/Reveal";
import { formatDate } from "@/lib/date";

const fmt = formatDate; // deterministic (see lib/date.ts)

function PostCard({ post, featured = false }: { post: PostMeta; featured?: boolean }) {
  return (
    <SpotlightCard featured={featured} className="h-full">
      <div className={featured ? "grid h-full gap-0 md:grid-cols-2" : "flex h-full flex-col"}>
        {featured && (
          <div aria-hidden className="relative hidden min-h-[220px] items-center justify-center overflow-hidden bg-surface-2 md:flex">
            <div className="absolute inset-0 bg-glow-hero opacity-90" />
            <span className="relative font-serif text-[7rem] italic leading-none text-gradient">Aa</span>
          </div>
        )}
        <div className="flex flex-1 flex-col p-6 md:p-7">
          <p className="mb-3 font-mono text-mono text-fg-subtle">
            <time dateTime={post.date} className="tabular-nums">{fmt(post.date)}</time> · {post.readingMinutes} min read
          </p>
          <h3 className={`mb-3 line-clamp-3 ${featured ? "text-h2" : "text-h3"}`}>
            <Link href={`/blog/${post.slug}/`} className="-my-2.5 inline-block py-2.5 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {post.title}
            </Link>
          </h3>
          <p className="mb-5 line-clamp-3 text-fg-muted">{post.summary}</p>
          <ul className="mt-auto flex flex-wrap gap-2" aria-label="Tags">
            {post.tags.map((t) => (
              <li key={t} className="chip">{t}</li>
            ))}
          </ul>
          <span className="mt-5 inline-flex items-center gap-1 text-small font-semibold text-accent" aria-hidden>
            Read <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </SpotlightCard>
  );
}

export default function BlogRoll({ posts, variant = "home" }: { posts: PostMeta[]; variant?: "home" | "index" }) {
  const [tag, setTag] = useState<string | null>(null);
  const tags = useMemo(() => Array.from(new Set(posts.flatMap((p) => p.tags))).sort(), [posts]);

  if (posts.length === 0) {
    return <p className="rounded-md border border-line bg-surface p-8 text-fg-muted">First post coming soon.</p>;
  }

  const isIndex = variant === "index";
  const shown = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;
  const [first, ...rest] = shown;
  const showFeatured = isIndex && !!first;

  return (
    <div>
      {isIndex && tags.length > 1 && (
        <div role="group" aria-label="Filter posts by tag" className="-mx-1 mb-8 flex snap-x gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap">
          {[null, ...tags].map((t) => (
            <button
              key={t ?? "all"}
              type="button"
              aria-pressed={tag === t}
              onClick={() => setTag(t)}
              className={`chip min-h-11 shrink-0 snap-start px-4 py-2 text-small transition-colors ${
                tag === t ? "!border-accent !bg-accent/15 !text-accent-hi" : "hover:border-line-strong hover:text-fg"
              }`}
            >
              {t ?? "All"}
            </button>
          ))}
        </div>
      )}
      <AnimatePresence mode="popLayout">
        <motion.div layout className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {showFeatured && (
            <Reveal key={first.slug} className="md:col-span-2 lg:col-span-3">
              <PostCard post={first} featured />
            </Reveal>
          )}
          {(showFeatured ? rest : shown).map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.08}>
              <PostCard post={p} />
            </Reveal>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
