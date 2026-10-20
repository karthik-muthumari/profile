import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getAllPosts, getAllSlugs, getPost } from "@/lib/posts";
import PostChrome from "@/components/PostChrome";
import { CopyLink, Toc } from "@/components/PostExtras";
import { profile } from "../../../../content/resume";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return post ? { title: post.title, description: post.summary } : { title: "Not found" };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const all = getAllPosts();
  const i = all.findIndex((p) => p.slug === slug);
  const newer = i > 0 ? all[i - 1] : null;
  const older = i < all.length - 1 ? all[i + 1] : null;

  return (
    <article className="container-x pb-section pt-10 md:pt-16">
      <PostChrome />
      <div className="xl:grid xl:grid-cols-12 xl:gap-8">
        <div className="mx-auto w-full max-w-prose xl:col-span-7 xl:col-start-3 xl:mx-0">
          <div>
            <Link href="/blog/" className="mb-8 inline-flex min-h-11 items-center gap-1 text-small text-fg-muted hover:text-accent">
              ← All posts
            </Link>
            <ul className="mb-5 flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t} className="chip">{t}</li>
              ))}
            </ul>
            <h1 className="mb-6 text-h1">{post.title}</h1>
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-mono text-fg-subtle">
                <span>{profile.name}</span>
                <span aria-hidden>·</span>
                <time dateTime={post.date} className="tabular-nums">{formatDate(post.date)}</time>
                <span aria-hidden>·</span>
                <span>{post.readingMinutes} min read</span>
              </p>
              <CopyLink />
            </div>
            <div className="prose-post text-body" dangerouslySetInnerHTML={{ __html: post.html }} />

            <nav aria-label="More posts" className="mt-16 grid gap-4 border-t border-line pt-10 sm:grid-cols-2">
              {newer ? (
                <Link href={`/blog/${newer.slug}/`} className="card block p-5 hover:-translate-y-1 hover:border-accent/40 hover:shadow-md">
                  <span className="text-micro uppercase text-fg-subtle">Newer</span>
                  <span className="mt-2 block font-display text-h4">{newer.title}</span>
                </Link>
              ) : <span />}
              {older ? (
                <Link href={`/blog/${older.slug}/`} className="card block p-5 hover:-translate-y-1 hover:border-accent/40 hover:shadow-md sm:text-right">
                  <span className="text-micro uppercase text-fg-subtle">Older</span>
                  <span className="mt-2 block font-display text-h4">{older.title}</span>
                </Link>
              ) : <span />}
            </nav>
          </div>
        </div>
        <aside className="xl:col-span-3"><Toc items={post.toc} /></aside>
      </div>
    </article>
  );
}
