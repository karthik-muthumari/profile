import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import ThemeProvider from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RouteAnnouncer from "@/components/RouteAnnouncer";
import BackToTop from "@/components/BackToTop";
import { primaryEmail, profile } from "../../content/resume";

// Person schema: name, jobTitle, sameAs and the preferred email only (no phone/address).
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.role,
  email: `mailto:${primaryEmail}`,
  sameAs: [profile.linkedin, profile.github],
};

export const metadata: Metadata = {
  title: { default: `${profile.name} — ${profile.role}`, template: `%s · ${profile.name}` },
  description: profile.summary,
  other: { "color-scheme": "dark light" },
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/favicon.svg` },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0D12" },
    { media: "(prefers-color-scheme: light)", color: "#FBF8F2" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <ThemeProvider>
          <a
            href="#main"
            className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-pill bg-grad-accent px-5 py-3 text-small font-semibold text-accent-ink focus:translate-y-0"
          >
            Skip to content
          </a>
          <div className="grain" aria-hidden />
          <Navbar />
          <main id="main" tabIndex={-1} className="relative z-[1] min-h-screen pt-nav outline-none">
            {children}
          </main>
          <Footer />
          <BackToTop />
          <RouteAnnouncer />
        </ThemeProvider>
      </body>
    </html>
  );
}
