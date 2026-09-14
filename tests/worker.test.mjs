import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker/index.js";

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
    assert.equal(outbound.payload.to[0], "raiyanoff@gmail.com");
    assert.equal(outbound.payload.reply_to, "ada@example.com");
    assert.equal(outbound.payload.subject, "[DEERFIELD] Updated subject");
    assert.equal(outbound.payload.text, "Edited inquiry content");
    assert.equal(outbound.options.headers.authorization, "Bearer test-key");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
