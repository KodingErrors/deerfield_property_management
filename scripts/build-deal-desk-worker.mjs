import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(project, "dist");
const client = join(dist, "client");
const server = join(dist, "server");
const metadata = join(dist, ".openai");

// Windows keeps a lock on these folders while a dev server is serving from them, which
// surfaces as a bare EBUSY. Retry briefly, then say what the caller actually has to do.
async function clear(directory) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await rm(directory, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!["EBUSY", "ENOTEMPTY", "EPERM"].includes(error.code) || attempt === 6) {
        if (["EBUSY", "ENOTEMPTY", "EPERM"].includes(error.code)) {
          throw new Error(
            `Could not clear ${directory} because another process is using it. ` +
            "Stop any running `npm start` / wrangler dev (and leftover workerd processes), then build again."
          );
        }
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

await clear(client);
await clear(server);
await clear(metadata);
await mkdir(client, { recursive: true });

for (const entry of await readdir(dist, { withFileTypes: true })) {
  if (["client", "server", ".openai"].includes(entry.name)) continue;
  await cp(join(dist, entry.name), join(client, entry.name), { recursive: true });
}

await mkdir(server, { recursive: true });
await mkdir(metadata, { recursive: true });
await cp(join(project, "worker", "index.js"), join(server, "index.js"));
await cp(join(project, ".openai", "hosting.json"), join(metadata, "hosting.json"));

const wrangler = {
  main: "index.js",
  // Must not exceed the newest date the pinned wrangler's runtime supports, or the
  // local server refuses to start.
  compatibility_date: "2026-05-22",
  compatibility_flags: ["nodejs_compat"],
  assets: {
    directory: "../client",
    binding: "ASSETS",
    run_worker_first: ["/api/*"],
    html_handling: "auto-trailing-slash",
    not_found_handling: "none"
  }
};
await writeFile(join(server, "wrangler.json"), `${JSON.stringify(wrangler, null, 2)}\n`);

// wrangler reads .dev.vars next to its config, which lives in this generated folder.
// Carry the project-root file across so local secrets can stay in one ignored place.
const devVars = join(project, ".dev.vars");
if (existsSync(devVars)) await cp(devVars, join(server, ".dev.vars"));

const hosting = JSON.parse(await readFile(join(metadata, "hosting.json"), "utf8"));
if (hosting.static) throw new Error("Worker hosting metadata must not include static configuration.");

console.log("Deerfield Deal Desk worker bundle prepared.");
