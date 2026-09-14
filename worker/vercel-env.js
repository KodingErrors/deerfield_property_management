// Vercel's edge runtime inlines statically analyzable `process.env.NAME` references at
// build time. Passing the whole `process.env` object through would hand the worker an
// empty bag, so every variable it reads is named here explicitly.
export function vercelEnv() {
  return {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    INQUIRY_RECIPIENT: process.env.INQUIRY_RECIPIENT
  };
}
