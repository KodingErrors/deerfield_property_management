// Vercel Edge Function for GET /api/inquiry-config. See api/inquiries.js.
import handler from "../worker/index.js";
import { vercelEnv } from "../worker/vercel-env.js";

export const config = { runtime: "edge" };

export default function inquiryConfig(request) {
  return handler.fetch(request, vercelEnv());
}
