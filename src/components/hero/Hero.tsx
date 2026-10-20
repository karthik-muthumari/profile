import { resolveAvatar } from "./resolveAvatar";
import HeroClient from "./HeroClient";

/** Server component: resolves the avatar at build time, then hands off to the animated client hero. */
export default function Hero() {
  return <HeroClient avatar={resolveAvatar()} />;
}
