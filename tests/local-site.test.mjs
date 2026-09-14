import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { properties } from "../dist/data.js";
import { seedFeatures } from "../dist/seed-traits.js";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

test("all public brokerage routes are local artifacts", () => {
  for (const route of ["index.html", "about/index.html", "services/index.html", "properties/index.html", "property/index.html", "contact/index.html", "privacy-policy/index.html"]) {
    assert.equal(existsSync(join(dist, route)), true, `missing ${route}`);
  }
});

test("the site contains no outbound Deerfield website URLs", () => {
  const textFiles = filesUnder(dist).filter((path) => /\.(?:html|js|css|svg)$/.test(path));
  for (const file of textFiles) {
    const contents = readFileSync(file, "utf8");
    assert.doesNotMatch(contents, /https?:\/\/(?:www\.)?deerfieldbrokerage\.com/i, file);
  }
});

test("every portfolio record has a packaged image", () => {
  assert.equal(properties.length, 29);
  for (const property of properties) {
    assert.ok(property.image, `${property.name} has no image`);
    assert.equal(existsSync(join(dist, property.image)), true, `missing image for ${property.name}`);
  }
});

test("property detail links remain inside Deal Desk", () => {
  for (const property of properties) assert.match(property.sourceUrl, /^\.\/property\/\?id=/);
});

test("contact form supports compact multiple properties without a confirmation gate", () => {
  const contactPage = readFileSync(join(dist, "contact/index.html"), "utf8");
  assert.match(contactPage, /id="contact-property-toggle"/);
  assert.match(contactPage, /id="contact-property-options"/);
  assert.doesNotMatch(contactPage, /consent-check/);

  const contactScript = readFileSync(join(dist, "contact.js"), "utf8");
  assert.match(contactScript, /selectedPropertyIds = new Set/);
});

test("contact form includes callback selection and editable email review", () => {
  const contactPage = readFileSync(join(dist, "contact/index.html"), "utf8");
  assert.match(contactPage, /id="callback-availability"/);
  assert.match(contactPage, /9:00 a\.m\. to 5:00 p\.m\. Eastern/);
  assert.match(contactPage, /id="email-review-subject"/);
  assert.match(contactPage, /id="email-review-body"/);
});

test("seed feature data is deterministic and never overrides a real value", () => {
  assert.deepEqual(seedFeatures("industrial-88", "industrial"), seedFeatures("industrial-88", "industrial"));
  assert.notDeepEqual(seedFeatures("industrial-88", "industrial"), seedFeatures("retail-65", "retail"));

  // office-89 carries parking: true from the published listing, so the seed must lose.
  const office = properties.find((property) => property.id === "office-89");
  assert.equal(office.features.parking, true);
});

test("the portfolio keeps unconfirmed features so the verification path stays live", () => {
  const values = properties.flatMap((property) => Object.values(property.features));
  assert.ok(values.some((value) => value === null), "no unknown features remain");
  assert.ok(values.some((value) => value === true), "no confirmed features present");
  assert.ok(values.some((value) => value === false), "no ruled-out features present");
});

test("the portfolio page discloses that feature data is sample data", () => {
  const page = readFileSync(join(dist, "properties/index.html"), "utf8");
  assert.match(page, /sample data/i);
});

test("callback availability offers both a grid and a range builder", () => {
  const contactPage = readFileSync(join(dist, "contact/index.html"), "utf8");
  for (const id of ["callback-availability", "callback-range-builder", "callback-range-day", "callback-range-start", "callback-range-end", "callback-range-add", "callback-range-chips", "callback-mode-toggle"]) {
    assert.match(contactPage, new RegExp(`id="${id}"`), `missing #${id}`);
  }
});

test("the review dialog shows the delivery envelope, not a hardcoded address", () => {
  const contactPage = readFileSync(join(dist, "contact/index.html"), "utf8");
  for (const id of ["review-to", "review-from", "review-reply-to", "review-subject-final"]) {
    assert.match(contactPage, new RegExp(`id="${id}"`), `missing #${id}`);
  }
  assert.match(contactPage, /Resend API/);

  const contactScript = readFileSync(join(dist, "contact.js"), "utf8");
  assert.match(contactScript, /\/api\/inquiry-config/);
  assert.match(contactScript, /enforceSubject/);
});

test("phone is optional and nothing can wedge the form's validity", () => {
  const contactPage = readFileSync(join(dist, "contact/index.html"), "utf8");
  const phoneField = contactPage.match(/<input name="phone"[^>]*>/)[0];
  assert.doesNotMatch(phoneField, /\brequired\b/, "phone must not be a required field");
  assert.match(contactPage, /<span>Phone <small>Optional<\/small><\/span>/);

  // setCustomValidity inside the submit handler is a trap: once the field is invalid the
  // browser stops firing submit, so the line that clears the message never runs again and
  // the form can never be submitted. Keep the handler free of it.
  const contactScript = readFileSync(join(dist, "contact.js"), "utf8");
  assert.doesNotMatch(contactScript, /setCustomValidity/);
});

test("the portfolio page supports selecting and comparing properties", () => {
  const page = readFileSync(join(dist, "properties/index.html"), "utf8");
  for (const id of ["compare-bar", "compare-bar-count", "compare-open", "compare-clear", "portfolio-compare-dialog", "portfolio-compare-content"]) {
    assert.match(page, new RegExp(`id="${id}"`), `missing #${id}`);
  }

  const script = readFileSync(join(dist, "properties.js"), "utf8");
  assert.match(script, /compareSelection = new Set/);
  assert.match(script, /data-compare=/);
  // The comparison hands every chosen property to the contact form at once.
  assert.match(script, /property=\$\{encodeURIComponent\(item\.id\)\}/);

  const contactScript = readFileSync(join(dist, "contact.js"), "utf8");
  assert.match(contactScript, /getAll\("property"\)/, "contact page must accept multiple properties");
});

test("the results view can send an inquiry through the same endpoint as the contact form", () => {
  const script = readFileSync(join(dist, "app.js"), "utf8");
  assert.match(script, /enforceSubject/);
  assert.match(script, /\/api\/inquiry-config/);
  assert.match(script, /"\/api\/inquiries"/);
  assert.match(script, /data-send-inquiry/);
  // The mailto route stays as a fallback for the static preview.
  assert.match(script, /data-open-email/);
  assert.doesNotMatch(script, /Opening email does not send it/);
});
