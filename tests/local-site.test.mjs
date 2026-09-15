import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { properties } from "../lib/data.js";
import { seedFeatures } from "../lib/seed-traits.js";
import { seedDetails } from "../lib/seed-details.js";

// A guardrail suite over the shipped source, not a unit test: it fails the build when a
// change breaks one of the site-wide promises. It reads the App Router tree, the client
// components and the pure modules as text, so it needs no browser and no build step.
const root = fileURLToPath(new URL("../", import.meta.url));
const app = join(root, "app");
const components = join(root, "components");
const lib = join(root, "lib");
const publicDir = join(root, "public");

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

const read = (path) => readFileSync(join(root, path), "utf8");
const sourceFiles = [app, components, lib, publicDir]
  .flatMap(filesUnder)
  .filter((path) => /\.(?:tsx?|jsx?|mjs|css|svg|html)$/.test(path) && !path.includes("__verify") && !path.includes("__dbg"));

test("all public brokerage routes are local artifacts", () => {
  for (const route of ["page.tsx", "about/page.tsx", "services/page.tsx", "properties/page.tsx", "property/page.tsx", "contact/page.tsx", "privacy-policy/page.tsx"]) {
    assert.equal(existsSync(join(app, route)), true, `missing ${route}`);
  }
  // Both API routes delegate to the Worker instead of reimplementing delivery.
  for (const route of ["api/inquiries/route.ts", "api/inquiry-config/route.ts"]) {
    assert.match(read(join("app", route)), /from "@\/worker\/index\.js"/, `${route} must reuse worker/index.js`);
  }
});

test("the site contains no outbound Deerfield website URLs", () => {
  for (const file of sourceFiles) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /https?:\/\/(?:www\.)?deerfieldbrokerage\.com/i, file);
  }
});

test("every portfolio record has a packaged image", () => {
  assert.equal(properties.length, 29);
  for (const property of properties) {
    assert.ok(property.image, `${property.name} has no image`);
    assert.equal(existsSync(join(publicDir, property.image)), true, `missing image for ${property.name}`);
  }
});

test("property detail links remain inside Deal Desk", () => {
  for (const property of properties) assert.match(property.sourceUrl, /^\/property\/\?id=/);
});

test("contact form supports compact multiple properties without a confirmation gate", () => {
  const contact = read("components/contact-form.tsx");
  for (const id of ["contact-property-toggle", "contact-property-options", "contact-property-summary", "contact-property-chips"]) {
    assert.match(contact, new RegExp(`id="${id}"`), `missing #${id}`);
  }
  assert.doesNotMatch(contact, /consent-check/);
  assert.match(contact, /getAll\("property"\)/, "contact page must accept multiple properties");
});

test("contact form includes callback selection and editable email review", () => {
  const picker = read("components/callback-picker.tsx");
  assert.match(picker, /id="callback-availability"/);
  assert.match(picker, /9:00 a\.m\. to 5:00 p\.m\. Eastern/);
  const contact = read("components/contact-form.tsx");
  assert.match(contact, /id="email-review-subject"/);
  assert.match(contact, /id="email-review-body"/);
  assert.match(contact, /<CallbackPicker/);
});

test("callback availability offers both a grid and a range builder", () => {
  const picker = read("components/callback-picker.tsx");
  for (const id of ["callback-availability", "callback-grid-view", "callback-range-builder", "callback-range-day", "callback-range-start", "callback-range-end", "callback-range-add", "callback-range-chips", "callback-mode-toggle"]) {
    assert.match(picker, new RegExp(`id="${id}"`), `missing #${id}`);
  }
  // Both inquiry paths mount the one picker; the wizard's modal leads with the list view.
  assert.match(read("components/wizard/contact-modal.tsx"), /<CallbackPicker[^>]*mode="list"/s);
});

test("the review dialogs show the delivery envelope, not a hardcoded address", () => {
  const contact = read("components/contact-form.tsx");
  for (const id of ["review-to", "review-from", "review-reply-to", "review-subject-final"]) {
    assert.match(contact, new RegExp(`id="${id}"`), `missing #${id}`);
  }
  assert.match(contact, /Resend API/);
  assert.match(contact, /enforceSubject/);
  assert.match(read("components/use-delivery-config.ts"), /\/api\/inquiry-config/);

  const modal = read("components/wizard/contact-modal.tsx");
  for (const id of ["wizard-to", "wizard-from", "wizard-reply-to", "wizard-subject"]) {
    assert.match(modal, new RegExp(`id="${id}"`), `missing #${id}`);
  }
});

test("phone is optional and nothing can wedge a form's validity", () => {
  const contact = read("components/contact-form.tsx");
  assert.match(contact, /<span>Phone <small>Optional<\/small><\/span>/);
  assert.doesNotMatch(contact, /<PhoneInput[^>]*\brequired\b/, "phone must not be a required field");
  // setCustomValidity inside a submit handler is a trap: once the field is invalid the
  // browser stops firing submit, so the line that clears the message never runs again.
  for (const file of ["components/contact-form.tsx", "components/wizard/contact-modal.tsx"]) {
    assert.doesNotMatch(read(file), /setCustomValidity/, file);
  }
});

test("the portfolio page supports selecting and comparing properties", () => {
  const portfolio = read("components/portfolio.tsx");
  for (const id of ["compare-bar", "compare-bar-count", "compare-open", "compare-clear", "portfolio-compare-dialog", "portfolio-compare-content"]) {
    assert.match(portfolio, new RegExp(`id="${id}"`), `missing #${id}`);
  }
  assert.match(portfolio, /compareSelection/);
  assert.match(portfolio, /data-compare=/);
  // The comparison hands every chosen property to the contact form at once.
  assert.match(portfolio, /property=\$\{encodeURIComponent\(item\.id\)\}/);
});

test("the results view can send an inquiry through the same endpoint as the contact form", () => {
  const modal = read("components/wizard/contact-modal.tsx");
  assert.match(modal, /enforceSubject/);
  assert.match(modal, /"\/api\/inquiries"/);
  assert.match(modal, /<SendButton/);
  // The mailto route stays as a fallback for mail clients the visitor prefers.
  assert.match(modal, /mailto:/);
  assert.doesNotMatch(modal, /Opening email does not send it/);
});

test("the portfolio page discloses that feature data is sample data", () => {
  assert.match(read("components/portfolio.tsx"), /sample data/i);
});

test("the theme is applied before paint and persisted under the original key", () => {
  const theme = read("lib/theme.ts");
  assert.match(theme, /deerfield-theme/);
  assert.match(theme, /prefers-color-scheme/);
  // The boot script has to run in <head>, or a dark-mode visitor sees a light flash.
  assert.match(read("app/layout.tsx"), /THEME_BOOT/);
  assert.match(read("app/layout.tsx"), /<head>/);
});

test("the saved search stays versioned so an older shape is discarded", () => {
  const search = read("lib/search.ts");
  assert.match(search, /deerfield-search-v1/);
  assert.match(search, /parsed\.version !== 1/);
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

test("seed details are deterministic and shaped by property type", () => {
  assert.deepEqual(
    seedDetails("industrial-88", "industrial", true, "Burlington"),
    seedDetails("industrial-88", "industrial", true, "Burlington")
  );

  const byId = (id) => properties.find((property) => property.id === id);
  const industrial = byId("industrial-88").details;
  const retail = byId("retail-65").details;
  const office = byId("office-89").details;

  assert.ok(industrial.clearHeight && industrial.truckDoors !== undefined && industrial.power);
  assert.equal(industrial.frontage, undefined, "industrial must not carry retail frontage");
  assert.ok(retail.frontage && retail.trafficCount);
  assert.equal(retail.clearHeight, undefined, "retail must not carry a clear height");
  assert.ok(office.floors && office.commonArea);
  assert.equal(office.truckDoors, undefined, "office must not carry loading doors");

  for (const property of properties) {
    assert.ok(property.details.summary, `${property.name} has no summary`);
    assert.ok(property.details.askingRate.startsWith("$"), `${property.name} has no asking rate`);
    assert.equal(
      property.details.availableFrom === "Not currently listed",
      property.available === false,
      `${property.name} availability text disagrees with its listing state`
    );
  }
});

test("generated specifics stay plausible", () => {
  for (const property of properties.filter((item) => item.type === "office")) {
    if (property.details.floors >= 3) {
      assert.ok(property.details.elevators >= 1, `${property.name}: ${property.details.floors} floors with no elevator`);
    }
  }
  for (const property of properties) {
    assert.ok(property.details.yearBuilt >= 1955 && property.details.yearBuilt <= 2015);
  }
});

test("seed details never reach the matcher", () => {
  // Generated specifics are presentational. If the matcher read them, invented data would
  // start deciding which properties are eligible, excluded or ranked.
  assert.doesNotMatch(read("lib/matcher.js"), /\bdetails\b/);
});

test("a listing photo links straight to its detail page", () => {
  const portfolio = read("components/portfolio.tsx");
  assert.match(portfolio, /portfolio-card-visual card-photo-link/);
  assert.match(portfolio, /href=\{item\.sourceUrl\}/);
  // The text link stays: it is the affordance that reads in a screen reader.
  assert.match(portfolio, /View property details/);

  const results = read("components/wizard/results.tsx");
  assert.match(results, /property-visual card-photo-link/);
  assert.match(results, /View property details/);
});

test("the pure modules stay free of React and the DOM", () => {
  // lib/ is the layer the tests and the Worker share; a DOM reference here would break
  // both, so it must run under plain node. theme.ts and search.ts are the deliberate
  // exceptions: they own browser storage.
  const browserOk = new Set(["theme.ts", "search.ts"]);
  for (const file of filesUnder(lib)) {
    const name = file.slice(lib.length + 1);
    const contents = readFileSync(file, "utf8");
    assert.doesNotMatch(contents, /from "react/, name);
    if (browserOk.has(name)) continue;
    // Deliberately not "window": callback-windows.js calls its own windows that.
    assert.doesNotMatch(contents, /\bdocument\b|\bnavigator\b|\bmatchMedia\b|\blocalStorage\b/, name);
  }
});
