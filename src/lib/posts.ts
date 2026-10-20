import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";

/** Build-time only (Node). Never imported by client components. */
const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export interface PostMeta {
  slug: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  summary: string;
  tags: string[];
  readingMinutes: number;
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface Post extends PostMeta {
  html: string;
  toc: TocItem[];
}

/** Minimal rehype plugin: make <pre> keyboard-scrollable and expose the language label. */
interface HNode { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HNode[] }
function rehypeCodeBlocks() {
  const walk = (n: HNode) => {
    if (n.type === "element" && n.tagName === "pre") {
      const code = n.children?.find((c) => c.tagName === "code");
      const cls = (code?.properties?.className as string[] | undefined)?.find((c) => c.startsWith("language-"));
      const lang = cls?.replace("language-", "");
      n.properties = { ...n.properties, tabIndex: 0, ariaLabel: lang ? `${lang} code` : "Code", ...(lang ? { "data-lang": lang } : {}) };
    }
    n.children?.forEach(walk);
  };
  return (tree: HNode) => walk(tree);
}

function files(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR).filter((f) => /\.(md|mdx)$/.test(f));
}

function parse(file: string) {
  const slug = file.replace(/\.(md|mdx)$/, "");
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
  const { data, content } = matter(raw);
  const d = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? "");
  const words = content.trim().split(/\s+/).length;
  const meta: PostMeta = {
    slug,
    title: String(data.title ?? slug),
    date: d,
    summary: String(data.summary ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
  return { meta, content, draft: data.draft === true };
}

export function getAllPosts(): PostMeta[] {
  return files()
    .map(parse)
    .filter((p) => !p.draft)
    .map((p) => p.meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}

export async function getPost(slug: string): Promise<Post | null> {
  const file = files().find((f) => f.replace(/\.(md|mdx)$/, "") === slug);
  if (!file) return null;
  const { meta, content } = parse(file);
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeCodeBlocks)
      .use(rehypeAutolinkHeadings, { behavior: "append", properties: { className: ["anchor"], ariaLabel: "Link to section" }, content: { type: "text", value: "#" } })
      .use(rehypeStringify)
      .process(content),
  );
  const toc: TocItem[] = [...html.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<a /g)].map((m) => ({
    level: Number(m[1]) as 2 | 3,
    id: m[2],
    text: m[3].replace(/<[^>]+>/g, ""),
  }));
  return { ...meta, html, toc };
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
