import fs from "node:fs";
import path from "node:path";
import { AVATAR } from "./avatar.config";

export interface ResolvedAvatar {
  src: string;
  kind: "image" | "video";
  isPrimary: boolean;
  alt: string;
}

/** Server-only (build time): first existing candidate under /public wins, else the fallback photo. */
export function resolveAvatar(): ResolvedAvatar {
  for (const c of AVATAR.candidates) {
    if (fs.existsSync(path.join(process.cwd(), "public", c))) {
      return { src: c, kind: /\.(webm|mp4)$/.test(c) ? "video" : "image", isPrimary: true, alt: AVATAR.alt };
    }
  }
  return { src: AVATAR.fallbackSrc, kind: "image", isPrimary: false, alt: AVATAR.fallbackAlt };
}
