import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";
import BlogRoll from "@/components/sections/BlogRoll";

export const metadata: Metadata = { title: "Writing", description: "Notes on engineering, AI-assisted development and AWS." };

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <section className="container-x pb-section pt-12 md:pt-20">
      <p className="eyebrow mb-3">Blog</p>
      <h1 className="mb-4 text-h1">
        Writing<span className="text-accent">.</span>
      </h1>
      <p className="mb-12 max-w-[56ch] text-lead text-fg-muted">
        Notes on building reliable systems, serverless on AWS, and working well with AI coding tools.
      </p>
      <BlogRoll posts={posts} variant="index" />
    </section>
  );
}
