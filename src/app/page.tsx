import Hero from "@/components/hero/Hero";
import Stats from "@/components/sections/Stats";
import ExperienceTimeline from "@/components/sections/ExperienceTimeline";
import Skills from "@/components/sections/Skills";
import ProjectsGrid from "@/components/sections/ProjectsGrid";
import BlogSection from "@/components/sections/BlogSection";
import Awards from "@/components/sections/Awards";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <ExperienceTimeline />
      <Skills />
      <ProjectsGrid />
      <BlogSection />
      <Awards />
      <Contact />
    </>
  );
}
