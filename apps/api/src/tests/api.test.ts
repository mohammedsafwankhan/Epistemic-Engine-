import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { Server } from "http";
import { createApp } from "../app.js";

describe("Epistemic Engine API Foundation Tests", () => {
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

  test("GET /health returns 200 with service info", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "ok");
    assert.strictEqual(body.service, "epistemic-engine-api");
    assert.ok(body.timestamp);
  });

  test("POST /projects creates a project with valid payload", async () => {
    const payload = {
      name: "Acme Summer Internship",
      processType: "INTERNSHIP_ONBOARDING",
      description: "Onboarding workflow for Summer 2026 software engineering interns",
    };

    const res = await fetch(`${baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.ok(body.id.startsWith("proj_"));
    assert.strictEqual(body.name, payload.name);
    assert.strictEqual(body.processType, payload.processType);
    assert.strictEqual(body.status, "DRAFT");
    assert.strictEqual(body.documentCount, 0);
  });

  test("POST /projects rejects invalid project name with 400", async () => {
    const payload = {
      name: "   ",
      processType: "INTERNSHIP_ONBOARDING",
    };

    const res = await fetch(`${baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "VALIDATION_ERROR");
    assert.strictEqual(body.error.message, "Project name is required");
  });

  test("POST /projects rejects invalid processType with 400", async () => {
    const payload = {
      name: "Invalid Process Project",
      processType: "NON_EXISTENT_TYPE",
    };

    const res = await fetch(`${baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "VALIDATION_ERROR");
  });

  test("GET /projects returns list of projects", async () => {
    const res = await fetch(`${baseUrl}/projects`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
  });

  test("GET /projects/:id returns 404 for non-existent project", async () => {
    const res = await fetch(`${baseUrl}/projects/non_existent_id`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.error.code, "NOT_FOUND");
  });

  test("Simulation endpoints reject projects without documents", async () => {
    // Create a project first
    const createRes = await fetch(`${baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Empty Project for Sim Test",
        processType: "INTERNSHIP_ONBOARDING",
      }),
    });
    const project = await createRes.json();

    // Check POST /projects/:id/simulate without documents
    const simulateRes = await fetch(`${baseUrl}/projects/${project.id}/simulate`, { method: "POST" });
    assert.strictEqual(simulateRes.status, 400);

    // Check POST /projects/:id/counterfactual without changes
    const counterRes = await fetch(`${baseUrl}/projects/${project.id}/counterfactual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes: [] }),
    });
    assert.strictEqual(counterRes.status, 400);
  });
});
