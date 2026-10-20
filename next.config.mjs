/** @type {import('next').NextConfig} */
// One config for user-site (`<user>.github.io`, base path "") and
// project-site (`<user>.github.io/<repo>`, NEXT_PUBLIC_BASE_PATH="/<repo>") hosting.
const raw = process.env.NEXT_PUBLIC_BASE_PATH || "";
const basePath = raw && raw !== "/" ? "/" + raw.replace(/^\/+|\/+$/g, "") : "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
