/** Re-mounts on every navigation → CSS enter animation (`.page-enter` in globals.css). Pure CSS on purpose: it does
 *  not depend on hydration, so page content is never stuck invisible waiting for JS (WebKit/slow networks). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
