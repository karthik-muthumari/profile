"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** After client-side navigation: move focus to <main> and announce the new page title politely. */
export default function RouteAnnouncer() {
  const pathname = usePathname();
  const first = useRef(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = window.setTimeout(() => {
      document.getElementById("main")?.focus({ preventScroll: true });
      setMsg(`Navigated to ${document.title}`);
    }, 100);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return <div aria-live="polite" role="status" className="sr-only">{msg}</div>;
}
