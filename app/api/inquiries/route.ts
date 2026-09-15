// POST /api/inquiries. worker/index.js stays the single source of inquiry logic so the
// route handler, the tests and any other host cannot drift apart.
import handler from "@/worker/index.js";
import { vercelEnv } from "@/worker/vercel-env.js";

export function POST(request: Request) {
  return handler.fetch(request, vercelEnv());
}
