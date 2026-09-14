import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker/index.js";
import { DEFAULT_RECIPIENT, enforceSubject } from "../dist/inquiry-format.js";

const delivery = {
  RESEND_API_KEY: "test-key",
  RESEND_FROM_EMAIL: "Deerfield Deal Desk <inquiries@example.com>"
};

// Captures the Resend call a request would make, without touching the network.
async function capture(payload, env = delivery) {
  const originalFetch = globalThis.fetch;
  let outbound;
  globalThis.fetch = async (url, options) => {
    outbound = { url, options, payload: JSON.parse(options.body) };
    return Response.json({ id: "email_123" });
  };
  try {
    const response = await worker.fetch(request(payload), env);
    return { response, outbound };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function inquiry(overrides = {}) {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    subject: "[DEERFIELD] Inquiry — Two properties",
    body: "Edited inquiry content",
    submissionId: "00000000-0000-4000-8000-000000000001",
    website: "",
    ...overrides
  };
}

function request(payload) {
  return new Request("https://example.com/api/inquiries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

test("email endpoint requires server-side Resend configuration", async () => {
  const response = await worker.fetch(request(inquiry()), {});
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /being configured/i);
});

test("email endpoint sends an editable inquiry with enforced categorization", async () => {
  const originalFetch = globalThis.fetch;
  let outbound;
  globalThis.fetch = async (url, options) => {
    outbound = { url, options, payload: JSON.parse(options.body) };
    return Response.json({ id: "email_123" });
  };
  try {
    const response = await worker.fetch(request(inquiry({ subject: "Updated subject" })), {
      RESEND_API_KEY: "test-key",
      RESEND_FROM_EMAIL: "Deerfield Deal Desk <inquiries@example.com>"
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, "email_123");
    assert.equal(outbound.url, "https://api.resend.com/emails");
    assert.equal(outbound.payload.to[0], DEFAULT_RECIPIENT);
    assert.equal(outbound.payload.reply_to, "ada@example.com");
    assert.equal(outbound.payload.subject, "[DEERFIELD] Updated subject");
    assert.equal(outbound.payload.text, "Edited inquiry content");
    assert.equal(outbound.options.headers.authorization, "Bearer test-key");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the recipient can be retargeted with INQUIRY_RECIPIENT", async () => {
  const { response, outbound } = await capture(inquiry(), {
    ...delivery,
    INQUIRY_RECIPIENT: "desk@example.com"
  });
  assert.equal(response.status, 200);
  assert.deepEqual(outbound.payload.to, ["desk@example.com"]);
});

test("a malformed INQUIRY_RECIPIENT falls back instead of dropping the inquiry", async () => {
  const { outbound } = await capture(inquiry(), { ...delivery, INQUIRY_RECIPIENT: "not-an-address" });
  assert.deepEqual(outbound.payload.to, [DEFAULT_RECIPIENT]);
});

test("the review dialog and the worker agree on the final subject", async () => {
  const drafts = [
    "Updated subject",
    "[DEERFIELD] Updated subject",
    "[deerfield]   Updated subject",
    "   ",
    "x".repeat(400)
  ];
  for (const draft of drafts) {
    const previewed = enforceSubject(draft);
    const { outbound } = await capture(inquiry({ subject: previewed }));
    assert.equal(outbound.payload.subject, previewed, `worker rewrote the previewed subject for ${JSON.stringify(draft)}`);
  }
});

test("the config endpoint reports the destination without leaking the API key", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/inquiry-config"),
    { ...delivery, INQUIRY_RECIPIENT: "desk@example.com" }
  );
  assert.equal(response.status, 200);
  const config = await response.json();
  assert.equal(config.recipient, "desk@example.com");
  assert.equal(config.from, delivery.RESEND_FROM_EMAIL);
  assert.equal(config.deliveryReady, true);
  assert.equal(JSON.stringify(config).includes("test-key"), false);
});

test("an unbound request without static assets does not crash the worker", async () => {
  const response = await worker.fetch(new Request("https://example.com/anything"), {});
  assert.equal(response.status, 404);
});

test("api routes match with or without a trailing slash", async () => {
  for (const path of ["/api/inquiry-config", "/api/inquiry-config/"]) {
    const response = await worker.fetch(new Request(`https://example.com${path}`), delivery);
    assert.equal(response.status, 200, `GET ${path}`);
  }

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ id: "email_123" });
  try {
    const response = await worker.fetch(
      new Request("https://example.com/api/inquiries/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(inquiry())
      }),
      delivery
    );
    assert.equal(response.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
