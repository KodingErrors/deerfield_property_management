// Keep these rules in step with lib/inquiry-format.js, which the review dialogs use to
// preview the outgoing email. tests/worker.test.mjs fails if the two ever diverge.
const DEFAULT_RECIPIENT = "raiyanworks@gmail.com";
const SUBJECT_PREFIX = "[DEERFIELD]";
const SUBJECT_DETAIL_MAX_LENGTH = 160 - SUBJECT_PREFIX.length - 1;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function clean(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// The destination can be retargeted on the host without a code deploy. A malformed
// value falls back rather than dropping the inquiry on the floor.
function resolveRecipient(env) {
  const configured = clean(env?.INQUIRY_RECIPIENT, 254);
  return validEmail(configured) ? configured : DEFAULT_RECIPIENT;
}

async function sendInquiry(request, env) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Please submit the inquiry from the contact form." }, 415);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "The inquiry could not be read. Please try again." }, 400);
  }

  if (clean(input.website, 200)) return json({ ok: true });

  const name = clean(input.name, 120);
  const email = clean(input.email, 254);
  // Mirrors enforceSubject() in lib/inquiry-format.js: strip, then truncate, then
  // re-apply the prefix, so the dialog's preview survives this pass untouched.
  const subjectDetail = clean(input.subject, 600)
    .replace(/^\[DEERFIELD\]\s*/i, "")
    .trim()
    .slice(0, SUBJECT_DETAIL_MAX_LENGTH)
    .trim();
  const subject = `${SUBJECT_PREFIX} ${subjectDetail || "Property inquiry"}`;
  const body = clean(input.body, 10000);
  const submissionId = clean(input.submissionId, 80);

  if (!name || !validEmail(email) || !body) {
    return json({ error: "Please provide your name, a valid email address, and an email message." }, 400);
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return json({ error: "Email delivery is being configured. Please try again shortly." }, 503);
  }

  let resendResponse;
  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
        ...(submissionId ? { "idempotency-key": `deerfield-${submissionId}` } : {})
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [resolveRecipient(env)],
        reply_to: email,
        subject,
        text: body,
        tags: [{ name: "source", value: "DEERFIELD" }]
      })
    });
  } catch (error) {
    console.error("Resend request failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "The email could not be sent right now. Please try again." }, 502);
  }

  if (!resendResponse.ok) {
    console.error("Resend delivery failed", resendResponse.status, (await resendResponse.text()).slice(0, 500));
    return json({ error: "The email could not be sent right now. Please try again." }, 502);
  }

  const result = await resendResponse.json();
  return json({ ok: true, id: result.id });
}

// Lets the contact page show the real destination in its review dialog instead of a
// hardcoded address. Reports whether sending is configured, never the API key.
function inquiryConfig(env) {
  return json({
    recipient: resolveRecipient(env),
    from: clean(env?.RESEND_FROM_EMAIL, 254) || null,
    subjectPrefix: SUBJECT_PREFIX,
    deliveryReady: Boolean(env?.RESEND_API_KEY && env?.RESEND_FROM_EMAIL)
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Hosts differ on whether they canonicalize a trailing slash, so match either form.
    const route = url.pathname.replace(/\/+$/, "") || "/";
    if (route === "/api/inquiries") {
      if (request.method !== "POST") {
        return new Response(null, { status: 405, headers: { allow: "POST" } });
      }
      return sendInquiry(request, env);
    }
    if (route === "/api/inquiry-config") {
      if (request.method !== "GET") {
        return new Response(null, { status: 405, headers: { allow: "GET" } });
      }
      return inquiryConfig(env);
    }
    // Only Cloudflare binds static assets here; on Vercel just the /api routes reach us.
    if (!env?.ASSETS) return new Response(null, { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
