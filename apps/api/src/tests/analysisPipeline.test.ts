import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { Server } from "http";
import { createApp } from "../app.js";

describe("End-to-End Analysis Pipeline & API Tests", () => {
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

  test("POST /projects/:id/analyze rejects projects with no documents", async () => {
    // Create empty project
    const projRes = await fetch(`${baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Empty Project",
        processType: "INTERNSHIP_ONBOARDING",
      }),
    });
    const proj = await projRes.json();

    // Trigger analyze
    const analyzeRes = await fetch(`${baseUrl}/projects/${proj.id}/analyze`, {
      method: "POST",
    });

    assert.strictEqual(analyzeRes.status, 400);
    const body = await analyzeRes.json();
    assert.strictEqual(body.error.code, "VALIDATION_ERROR");
  });

  test("POST /projects/:id/analyze rejects non-existent project with 404", async () => {
    const analyzeRes = await fetch(`${baseUrl}/projects/non_existent_123/analyze`, {
      method: "POST",
    });
    assert.strictEqual(analyzeRes.status, 404);
  });

  test("End-to-end pipeline: upload documents, run analysis, retrieve real graph, contradictions, unknowns", async () => {
    // 1. Create project
    const projRes = await fetch(`${baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Acme Intern Onboarding Process",
        processType: "INTERNSHIP_ONBOARDING",
      }),
    });
    const proj = await projRes.json();

    // 2. Upload Document 1: Offer Letter (specifying deadline Sep 30, physical signature)
    const doc1Text = `Acme Corporation Offer Letter
Offer Acceptance deadline: September 30, 2026.
Physical wet-ink signature required on page 2.
Must submit W-4 form before start date.`;

    const form1 = new FormData();
    form1.append("file", new Blob([doc1Text], { type: "text/plain" }), "Offer_Letter.txt");

    const uploadRes1 = await fetch(`${baseUrl}/projects/${proj.id}/documents/upload`, {
      method: "POST",
      body: form1,
    });
    assert.strictEqual(uploadRes1.status, 201);

    // 3. Upload Document 2: Portal Instructions (specifying conflicting deadline Sep 20, digital signature)
    const doc2Text = `Acme Onboarding Portal Instructions
Offer Acceptance deadline: September 20, 2026.
Digital electronic signatures accepted via portal.
Academic advisor must approve CPT authorization.`;

    const form2 = new FormData();
    form2.append("file", new Blob([doc2Text], { type: "text/plain" }), "Portal_Instructions.txt");

    const uploadRes2 = await fetch(`${baseUrl}/projects/${proj.id}/documents/upload`, {
      method: "POST",
      body: form2,
    });
    assert.strictEqual(uploadRes2.status, 201);

    // 4. Trigger Analysis Pipeline
    const analyzeRes = await fetch(`${baseUrl}/projects/${proj.id}/analyze`, {
      method: "POST",
    });
    assert.strictEqual(analyzeRes.status, 200);
    const analyzeData = await analyzeRes.json();
    const summary = analyzeData.data;

    assert.strictEqual(summary.projectId, proj.id);
    assert.strictEqual(summary.documents, 2);
    assert.ok(summary.facts > 0, "Facts should be > 0");
    assert.ok(summary.nodes > 0, "Nodes should be > 0");
    assert.ok(summary.edges > 0, "Edges should be > 0");
    assert.ok(summary.contradictions >= 2, "Should detect deadline and signature contradictions");
    assert.ok(summary.unknowns > 0, "Should identify missing obligation details");

    // 5. Verify GET /projects/:id/contradictions returns real detected contradictions
    const contraRes = await fetch(`${baseUrl}/projects/${proj.id}/contradictions`);
    assert.strictEqual(contraRes.status, 200);
    const contraData = await contraRes.json();
    assert.ok(contraData.data.length >= 2);

    const types = contraData.data.map((c: { type: string }) => c.type);
    assert.ok(types.includes("DEADLINE_CONFLICT"));
    assert.ok(types.includes("CONFLICTING_REQUIREMENT"));

    // 6. Verify GET /projects/:id/unknowns returns real unknowns
    const unkRes = await fetch(`${baseUrl}/projects/${proj.id}/unknowns`);
    assert.strictEqual(unkRes.status, 200);
    const unkData = await unkRes.json();
    assert.ok(unkData.data.length > 0);

    // 7. Verify GET /projects/:id/graph returns graph nodes and edges
    const graphRes = await fetch(`${baseUrl}/projects/${proj.id}/graph`);
    assert.strictEqual(graphRes.status, 200);
    const graphData = await graphRes.json();
    assert.ok(graphData.data.nodes.length > 0);
    assert.ok(graphData.data.edges.length > 0);
  });
});

