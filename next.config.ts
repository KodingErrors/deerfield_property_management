import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site has always used directory-style URLs (/about/, /contact/, /property/?id=…);
  // keep them so saved links and the sourceUrl guardrail test stay valid.
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
