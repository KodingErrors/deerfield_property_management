// The route handlers hand the worker only the variables it reads, named explicitly.
// (Vercel's build-time env inlining only recognises statically analyzable
// `process.env.NAME` references; passing `process.env` itself through would hand the
// worker an empty bag on some runtimes, and every inquiry would 503.)
export function vercelEnv() {
  return {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    INQUIRY_RECIPIENT: process.env.INQUIRY_RECIPIENT
  };
}
