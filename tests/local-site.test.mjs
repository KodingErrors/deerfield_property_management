import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { properties } from "../dist/data.js";

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
