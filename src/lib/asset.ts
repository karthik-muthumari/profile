/**
 * Base-path helper. next/link and next/image-less routing handle the base path
 * automatically, but plain <img src>, CSS url(), <link> and public/ files do NOT.
 * Wrap every such URL: asset("/images/x.jpg") -> "/my-profile/images/x.jpg".
 * Set NEXT_PUBLIC_BASE_PATH="/<repo>" at build time for project sites.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("mailto:") || path.startsWith("data:")) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
