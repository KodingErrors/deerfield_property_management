import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(project, "dist");
const client = join(dist, "client");
const server = join(dist, "server");
const metadata = join(dist, ".openai");

await rm(client, { recursive: true, force: true });
await rm(server, { recursive: true, force: true });
await rm(metadata, { recursive: true, force: true });
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
  compatibility_date: "2026-09-14",
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

const hosting = JSON.parse(await readFile(join(metadata, "hosting.json"), "utf8"));
if (hosting.static) throw new Error("Worker hosting metadata must not include static configuration.");

console.log("Deerfield Deal Desk worker bundle prepared.");
