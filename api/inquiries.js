// Vercel Edge Function for POST /api/inquiries. worker/index.js stays the single source
// of inquiry logic so the Cloudflare bundle, local wrangler dev and this deployment
// cannot drift apart.
import handler from "../worker/index.js";
import { vercelEnv } from "../worker/vercel-env.js";

export const config = { runtime: "edge" };

export default function inquiries(request) {
  return handler.fetch(request, vercelEnv());
}
