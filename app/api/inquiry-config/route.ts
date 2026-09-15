// GET /api/inquiry-config: where inquiries are delivered, so the review dialogs can show
// the real destination instead of a hardcoded address. See app/api/inquiries/route.ts.
import handler from "@/worker/index.js";
import { vercelEnv } from "@/worker/vercel-env.js";

export function GET(request: Request) {
  return handler.fetch(request, vercelEnv());
}
