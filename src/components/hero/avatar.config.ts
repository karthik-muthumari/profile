/**
 * ★ THE ONE PLACE TO SWAP THE AVATAR ★
 *
 * To use your Pixar-style avatar: drop a file at one of the `candidates` paths (inside /public)
 * and rebuild. The first candidate that exists at BUILD TIME is used; if none exist the real
 * photo (`fallbackSrc`) is shown. Want a different filename? Add it to `candidates`.
 *
 *   Recommended: transparent WebP/PNG, 1200×1200 (1:1), head ≈35% from top, ≤400 KB.
 *   Video (.webm/.mp4) is supported too: muted, looping, poster = fallback photo.
 *
 * Paths are relative to /public and are base-path prefixed automatically (see src/lib/asset.ts).
 */
export const AVATAR = {
  candidates: [
    "/avatar/pixar-avatar.webp",
    "/avatar/pixar-avatar.png",
    "/avatar/pixar-avatar.webm",
    "/avatar/pixar-avatar.mp4",
  ],
  fallbackSrc: "/avatar/karthik-fallback.jpg",
  alt: "Illustrated portrait of Karthik Muthumari",
  fallbackAlt: "Portrait photo of Karthik Muthumari",
};
