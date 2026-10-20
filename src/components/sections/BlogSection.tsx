import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllPosts } from "@/lib/posts";
import BlogRoll from "./BlogRoll";
import SectionHeader from "../ui/SectionHeader";

/** Home-page "latest posts" strip (server component: reads posts at build time). */
export default function BlogSection() {
  const posts = getAllPosts().slice(0, 3);
  return (
    <section id="blog" aria-labelledby="blog-title" className="section-y">
      <div className="container-x">
        <SectionHeader index="04" eyebrow="Blog" id="blog-title" title="Notes from the {trenches}" lead="Short write-ups on spec-driven development, local RAG and event-driven AWS." />
        <BlogRoll posts={posts} variant="home" />
        <div className="mt-10">
          <Link href="/blog/" className="btn-ghost h-12 hover:border-accent/60">
            All posts <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
