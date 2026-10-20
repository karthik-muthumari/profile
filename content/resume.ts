/**
 * Single source of truth for resume content. Edit here; components render from it.
 * PRIVACY: phone number and home address from the CV are intentionally NOT included.
 * Contact data (emails, GitHub, LinkedIn) lives in `profile` below and feeds Contact, Footer and Hero.
 */

export const profile = {
  name: "Karthik Muthumari",
  role: "Full-stack Engineer",
  headline: "I build resilient, event-driven web platforms for global retail & fintech.",
  tagline:
    "React · Next.js · Node.js · GraphQL · AWS (Certified Solutions Architect) · IaC with CDK & Terraform",
  location: "United Kingdom",
  summary:
    "Full-stack engineer with 14 years across retail, fintech and supply-chain products. I like clean architecture, accessible UIs, serverless backends on AWS, and — lately — making AI coding tools genuinely useful through spec-driven development.",
  // Contact details (publishing approved by the owner). Phone number and home address are NEVER published.
  emails: [
    { id: "personal", label: "Personal", address: "karthikmuthumari7@gmail.com", aria: "Email Karthik at personal address" },
    { id: "work", label: "Work", address: "karthik.muthumari@mindera.com", aria: "Email Karthik at work address" },
  ],
  github: "https://github.com/karthik-muthumari",
  linkedin: "https://www.linkedin.com/in/karthikmuthumari/",
};

/** Primary contact address used by single-email CTAs (hero icon, "Email me" button). */
export const primaryEmail = profile.emails[0].address;

export const stats = [
  { label: "Years of experience", value: 14, suffix: "+" },
  { label: "Client brands", value: 6, suffix: "" },
  { label: "AWS Certified", value: 2021, suffix: "" },
  { label: "IBM Hackathon", value: 2017, suffix: " winner" },
];

export interface Project {
  name: string;
  client: string;
  sector: string;
  role: string;
  duration: string;
  summary: string;
  highlights?: string[];
  tech: string[];
}

export interface Company {
  company: string;
  title: string;
  period: string;
  duration: string;
  blurb: string;
  projects: Project[];
}

export const experience: Company[] = [
  {
    company: "Mindera",
    title: "Full-stack Engineer",
    period: "Sept 2021 – Present",
    duration: "5 years",
    blurb: "Consulting engineer embedded with retail clients, from storefront MFEs to event-driven back ends.",
    projects: [
      {
        name: "Tax Engine",
        client: "Kingfisher PLC",
        sector: "Retail / E-Commerce",
        role: "Senior Engineer",
        duration: "Sept 2025 – Present",
        summary:
          "Tax calculation platform supporting basket and checkout services across multiple Kingfisher banners. Designed service components for tax data ingestion, persistence and runtime tax calculation, fed by enterprise tax data (plans, rates, jurisdictions) and Kafka event ingestion.",
        highlights: [
          "Applied Spec-Driven Development (SDD) with structured Markdown specs, project-level AI guardrails and reusable instructions using Claude Code.",
          "Built a local RAG knowledge-retrieval approach (vector embeddings, LanceDB, BM25 and Reciprocal Rank Fusion) to give LLMs relevant project context.",
        ],
        tech: ["Node.js", "TypeScript", "REST", "Kafka", "AWS Lambda", "CloudWatch", "DataDog", "CDK", "Claude Code", "LanceDB"],
      },
      {
        name: "Basket Orchestrator",
        client: "Kingfisher PLC",
        sector: "Retail / E-Commerce",
        role: "Senior Engineer",
        duration: "8 months",
        summary:
          "GraphQL basket orchestration layer, currently migrating legacy REST endpoints to a federated graph with end-to-end Playwright coverage.",
        highlights: [
          "AI-assisted development with GitHub Copilot, Codex and GitLab Duo for code generation, refactoring and test creation.",
        ],
        tech: ["Node.js", "TypeScript", "GraphQL", "Apollo Federation", "Playwright", "API Gateway", "Lambda", "Fargate", "DataDog", "Dynatrace", "CDK"],
      },
      {
        name: "PLP — Product Listing Page",
        client: "Selfridges",
        sector: "Fashion E-Commerce / Retail Tech",
        role: "Frontend Developer",
        duration: "1 year",
        summary:
          "Product listing micro-frontend integrating sponsored products, listings, quotes and the shared component library, served via CloudFront with Cloudflare in front.",
        tech: ["Next.js", "TypeScript", "GraphQL", "CloudFront", "S3", "Lambda", "CloudWatch RUM", "Cloudflare", "Dynatrace", "Contentstack", "CDK"],
      },
      {
        name: "Pricing",
        client: "Selfridges",
        sector: "Fashion E-Commerce / Retail Tech",
        role: "Full-stack Developer",
        duration: "2 years",
        summary:
          "Event-driven pricing application: S3, Lambda, Step Functions, SNS/SQS and DynamoDB orchestrate price events, with an authorised API layer and an internal vendor price-upload UI.",
        tech: ["Node.js", "TypeScript", "Step Functions", "SNS", "SQS", "DynamoDB", "API Gateway", "GitHub Actions", "CDK", "Terraform"],
      },
      {
        name: "VIP",
        client: "Selfridges",
        sector: "Fashion E-Commerce / Retail Tech",
        role: "Full-stack Developer",
        duration: "1 year",
        summary:
          "VIP-tier customer application: a serverless Next.js web app (accessibility-first) backed by a Node.js micro-service aggregator.",
        tech: ["Next.js", "a11y", "Node.js", "CloudFront", "API Gateway", "Lambda", "SQS", "WAF", "ALB", "New Relic", "CDK"],
      },
      {
        name: "Personal Shopper",
        client: "Selfridges",
        sector: "Fashion E-Commerce / Retail Tech",
        role: "Frontend Developer",
        duration: "1 year",
        summary:
          "Personal-shopper web application with a headless CMS, fronted by CloudFront and WAF, delivered through GitHub Actions.",
        tech: ["Gatsby.js", "a11y", "Strapi", "CloudFront", "WAF", "GitHub Actions", "CDK"],
      },
    ],
  },
  {
    company: "Wipro Technologies",
    title: "Senior Software Engineer",
    period: "Oct 2012 – Aug 2021",
    duration: "8.5 years",
    blurb: "From hybrid mobile apps in India to multi-region fintech platforms on-site in the UK.",
    projects: [
      {
        name: "Quick Check",
        client: "Capital One",
        sector: "FinTech / Banking",
        role: "Full-stack Developer (on-site UK)",
        duration: "Sept 2019 – Aug 2021",
        summary:
          "Credit eligibility checker with a React front end and Node.js micro-service orchestration, run hot-site across two AWS regions for resilience.",
        tech: ["React.js", "a11y", "Node.js", "CloudFront", "WAF", "S3", "ALB", "Lambda", "Jenkins", "Docker"],
      },
      {
        name: "CreditWise",
        client: "Capital One",
        sector: "FinTech / Banking",
        role: "Full-stack Developer (on-site UK)",
        duration: "Mar 2018 – Sept 2019",
        summary:
          "Credit-score tool on React and Node.js with active-passive regional standby, ElastiCache and a Jenkins/Docker pipeline.",
        tech: ["React.js", "a11y", "Node.js", "CloudFront", "EC2", "ElastiCache", "Jenkins", "Docker"],
      },
      {
        name: "Hines Supply",
        client: "US LBM",
        sector: "Retail / Supply Chain / E-Commerce",
        role: "Hybrid Mobile / Web App Developer (India)",
        duration: "Jan 2016 – Feb 2018",
        summary:
          "Payment, delivery and invoice-tracking hybrid app across Android, iOS and desktop browsers, with push notifications, camera, navigation and file transfer.",
        tech: ["Ionic", "Angular.js", "Push notifications", "Camera", "Navigation"],
      },
      {
        name: "Visual Merchandising",
        client: "COACH",
        sector: "Fashion E-Commerce / Retail Tech",
        role: "Hybrid Mobile App Developer (India)",
        duration: "Aug 2015 – Jan 2016",
        summary:
          "Merchandising app for phones and tablets with barcode scanning, offline catalogue storage, photo upload and news feeds.",
        tech: ["Ionic 3", "Angular 4", "SASS", "Barcode", "Offline storage"],
      },
      {
        name: "Pack Manager",
        client: "Cardinal Health",
        sector: "Healthcare / MedTech / Supply Chain",
        role: "Hybrid Mobile App Developer (India)",
        duration: "Jan 2015 – Aug 2015",
        summary:
          "Healthcare business app for iPads and Windows Surface Pro with lazy loading, QR/barcode scanning and e-signature capture.",
        tech: ["Angular.js", "Angular UI", "QR / Barcode", "E-signature"],
      },
    ],
  },
];

export const skillGroups = [
  { group: "Frontend", items: ["React.js + a11y", "Next.js", "Gatsby", "Ionic 2 & 3", "Angular 2 & 4", "React Native + Expo", "Google Tag Manager"] },
  { group: "Backend & APIs", items: ["Node.js", "TypeScript", "GraphQL + TypeGraphQL", "Apollo Federation", "Kafka"] },
  { group: "Cloud & IaC", items: ["AWS Lambda", "API Gateway", "S3 + CloudFront", "SQS + SNS", "Step Functions", "EC2 + ElastiCache", "WAF", "CDK", "SAM CLI", "Terraform", "Ansible"] },
  { group: "Quality & DevOps", items: ["Jest, TDD", "Playwright", "GitHub Actions", "GitLab Pipelines", "Jenkins", "Docker", "Git + branching strategy"] },
  { group: "AI tooling", items: ["Claude Code", "Copilot", "Cursor", "SDD · OpenSpec"] },
];

export const awards = [
  { title: "AWS Certified Solutions Architect – Associate", year: "2021", detail: "Designing resilient, cost-aware architectures on AWS." },
  { title: "IBM Hackathon — Winner", year: "2017", detail: "Mobile applications integrated with a chatbot built on IBM Watson & Bluemix." },
];

export const education = {
  degree: "B.E., Electronics & Communication Engineering",
  school: "Jeppiaar Engineering College, Anna University, Chennai, India",
  year: "2012",
};

export const languages = ["English", "Tamil"];

export type ProjectCategory = "Frontend" | "Backend" | "Cloud" | "AI";

export interface FeaturedProject {
  slug: string;
  name: string;
  client: string;
  summary: string;
  categories: ProjectCategory[];
  tech: string[];
  featured?: boolean;
  // Optional external links (leave undefined for confidential client work).
  href?: string;
  repo?: string;
}

/** Recent projects shown in the Projects grid (from the CV; kept generic & non-confidential). */
export const featuredProjects: FeaturedProject[] = [
  {
    slug: "tax-engine",
    name: "Tax Engine",
    client: "Kingfisher PLC",
    summary: "Tax calculation platform behind basket and checkout across multiple banners: Kafka-fed ingestion, persistence and runtime calculation on serverless AWS.",
    categories: ["Backend", "Cloud"],
    tech: ["Node.js", "TypeScript", "Kafka", "Lambda", "CDK", "DataDog"],
    featured: true,
  },
  {
    slug: "local-rag",
    name: "Local RAG for Project Context",
    client: "Kingfisher PLC",
    summary: "Local knowledge retrieval for LLM-assisted development: vector embeddings in LanceDB, BM25 lexical search and Reciprocal Rank Fusion, driven by Spec-Driven Development.",
    categories: ["AI", "Backend"],
    tech: ["LanceDB", "BM25", "RRF", "Claude Code", "SDD"],
  },
  {
    slug: "basket-orchestrator",
    name: "Basket Orchestrator",
    client: "Kingfisher PLC",
    summary: "GraphQL orchestration layer migrating legacy REST endpoints onto Apollo Federation, with Playwright coverage and full observability.",
    categories: ["Backend", "Cloud"],
    tech: ["GraphQL", "Apollo Federation", "Playwright", "Fargate", "Dynatrace"],
  },
  {
    slug: "selfridges-plp",
    name: "Product Listing Page (MFE)",
    client: "Selfridges",
    summary: "Next.js micro-frontend for product listings: sponsored products, quotes and the shared component library, with CloudFront, Cloudflare and RUM.",
    categories: ["Frontend", "Cloud"],
    tech: ["Next.js", "TypeScript", "GraphQL", "CloudFront", "Contentstack"],
  },
  {
    slug: "selfridges-pricing",
    name: "Event-driven Pricing",
    client: "Selfridges",
    summary: "Replayable pricing pipeline built from S3, Lambda, Step Functions, SNS/SQS and DynamoDB, plus an internal vendor upload UI.",
    categories: ["Backend", "Cloud"],
    tech: ["Step Functions", "SQS", "DynamoDB", "CDK", "Terraform"],
  },
  {
    slug: "quick-check",
    name: "Quick Check",
    client: "Capital One",
    summary: "Credit eligibility checker (React + Node.js) running hot-site across two AWS regions for resilience.",
    categories: ["Frontend", "Cloud"],
    tech: ["React", "a11y", "Node.js", "CloudFront", "WAF", "Jenkins"],
  },
  {
    slug: "selfridges-vip",
    name: "VIP Tier Application",
    client: "Selfridges",
    summary: "Accessibility-first serverless Next.js web app for VIP customers, backed by a Node.js micro-service aggregator on API Gateway and Lambda.",
    categories: ["Frontend", "Backend", "Cloud"],
    tech: ["Next.js", "a11y", "Node.js", "Lambda", "WAF", "New Relic"],
  },
  {
    slug: "hines-supply",
    name: "Hines Supply Mobile App",
    client: "US LBM",
    summary: "Hybrid payment, delivery and invoice-tracking app for Android, iOS and desktop browsers with push notifications, camera and file transfer.",
    categories: ["Frontend"],
    tech: ["Ionic", "Angular.js", "Push notifications", "Camera"],
  },
];
