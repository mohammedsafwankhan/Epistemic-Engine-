import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { Server } from "http";
import { createApp } from "../app.js";

describe("Contradiction Resolution Workflow Tests", () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (typeof address === "object" && address !== null) {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  test("resolves a detected contradiction and persists the user resolution decision", async () => {
    // 1. Create project
    const projRes = await fetch(`${baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Contradiction Resolution Project",
        processType: "INTERNSHIP_ONBOARDING",
      }),
    });
    const proj = await projRes.json();

    // 2. Upload Doc 1 & Doc 2 with conflicting deadlines
    const doc1 = `Offer Acceptance deadline: September 30, 2026. Physical wet-ink signature required.`;
    const doc2 = `Offer Acceptance deadline: September 20, 2026. Digital electronic signatures accepted.`;

    const form1 = new FormData();
    form1.append("file", new Blob([doc1], { type: "text/plain" }), "doc1.txt");
    await fetch(`${baseUrl}/projects/${proj.id}/documents/upload`, { method: "POST", body: form1 });

    const form2 = new FormData();
    form2.append("file", new Blob([doc2], { type: "text/plain" }), "doc2.txt");
    await fetch(`${baseUrl}/projects/${proj.id}/documents/upload`, { method: "POST", body: form2 });

    // 3. Analyze
    await fetch(`${baseUrl}/projects/${proj.id}/analyze`, { method: "POST" });

    // 4. Retrieve contradictions
    const contraRes = await fetch(`${baseUrl}/projects/${proj.id}/contradictions`);
    const contraData = await contraRes.json();
    assert.ok(contraData.data.length >= 1);

    const targetContra = contraData.data[0];

    // 5. Resolve contradiction
    const resolveRes = await fetch(
      `${baseUrl}/projects/${proj.id}/contradictions/${targetContra.id}/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: "ACCEPTED_A",
          notes: "Confirmed with university coordinator that September 30 is the official cut-off date.",
        }),
      }
    );

    assert.strictEqual(resolveRes.status, 200);
    const resolvedData = await resolveRes.json();
    assert.strictEqual(resolvedData.data.status, "RESOLVED");
    assert.strictEqual(resolvedData.data.resolution.resolution, "ACCEPTED_A");
    assert.ok(resolvedData.data.resolution.notes);
  });
});

