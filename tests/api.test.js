import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../server/store.js";
import { createApp, validUrl } from "../server/app.js";
test("URL validation rejects non-web protocols and credential URLs", () => {
  assert.equal(validUrl("javascript:alert(1)"), null);
  assert.equal(validUrl("https://user:pass@example.com"), null);
  assert.equal(validUrl("https://example.com"), "https://example.com/");
});
test("full account and link lifecycle", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tinyurl-test-"));
  try {
    const store = await createStore("", join(dir, "db.json"));
    const app = createApp(store, {
      secret: "testing-secret-32-characters-long",
      baseUrl: "https://links.example.com",
      origin: "https://links.example.com",
    });
    const owner = request.agent(app),
      other = request.agent(app);
    assert.equal((await request(app).get("/api/health")).body.ok, true);
    await request(app).get("/api/links").expect(401);
    await owner
      .post("/api/auth/register")
      .send({
        name: "Student",
        email: "student@example.com",
        password: "strong-pass-123",
      })
      .expect(201);
    const me = await owner.get("/api/auth/me").expect(200);
    assert.equal(me.body.user.email, "student@example.com");
    assert.equal(me.body.user.password, undefined);
    await request(app)
      .post("/api/auth/register")
      .send({
        name: "Student",
        email: "student@example.com",
        password: "strong-pass-123",
      })
      .expect(409);
    await other
      .post("/api/auth/register")
      .send({
        name: "Other",
        email: "other@example.com",
        password: "strong-pass-123",
      })
      .expect(201);
    await owner
      .post("/api/links")
      .set("Origin", "https://evil.example")
      .send({ url: "https://example.com" })
      .expect(403);
    await owner
      .post("/api/links")
      .send({ url: "javascript:alert(1)" })
      .expect(400);
    const link = await owner
      .post("/api/links")
      .send({ url: "https://example.com/long-page", alias: "final-project" })
      .expect(201);
    assert.equal(
      link.body.shortUrl,
      "https://links.example.com/s/final-project",
    );
    await owner
      .post("/api/links")
      .send({ url: "https://example.com", alias: "final-project" })
      .expect(409);
    await request(app)
      .get("/s/final-project")
      .expect(302)
      .expect("Location", "https://example.com/long-page");
    let list = await owner.get("/api/links").expect(200);
    assert.equal(list.body.links[0].clicks, 1);
    await other
      .patch("/api/links/final-project")
      .send({ url: "https://example.org" })
      .expect(404);
    await other.delete("/api/links/final-project").send({}).expect(404);
    await owner
      .patch("/api/links/final-project")
      .send({ url: "https://example.org/new" })
      .expect(200);
    await request(app)
      .get("/s/final-project")
      .expect("Location", "https://example.org/new");
    const qr = await request(app)
      .post("/api/qr")
      .send({ url: "https://example.com" })
      .expect(200);
    assert.match(qr.body.image, /^data:image\/png;base64,/);
    await request(app)
      .post("/api/contact")
      .send({
        name: "Student",
        email: "s@example.com",
        message: "Please help with my project.",
      })
      .expect(201);
    const reopened = await createStore("", join(dir, "db.json"));
    assert.equal((await reopened.link("final-project")).clicks, 2);
    await owner.delete("/api/links/final-project").send({}).expect(200);
    await request(app).get("/s/final-project").expect(404);
    await owner.post("/api/auth/logout").send({}).expect(200);
    await owner.get("/api/auth/me").expect(401);
    await owner
      .post("/api/auth/login")
      .send({ email: "student@example.com", password: "wrong" })
      .expect(401);
    await owner
      .post("/api/auth/login")
      .send({ email: "student@example.com", password: "strong-pass-123" })
      .expect(200);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("all frontend entry routes serve the production React shell", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tinyurl-routes-"));
  try {
    const store = await createStore("", join(dir, "db.json"));
    const app = createApp(store, { secret: "route-test-secret" });
    const routes = [
      "/",
      "/app/pricing",
      "/app/branded-domains",
      "/app/features/custom-links",
      "/app/features/link-management",
      "/app/features/branded-links",
      "/app/features/link-analytics",
      "/app/features/qr-code-generator",
      "/app/features/url-shortener-api",
      "/app/register",
      "/app/login",
      "/app/dashboard",
      "/app/blog",
      "/app/dev",
      "/app/proven-process",
      "/app/about-us",
      "/app/helpdesk",
      "/app/contact-sales",
      "/app/freescout",
      "/app/terms",
      "/app/privacy-policy",
      "/app/cookies-policy",
      "/app/accessibility",
      "/app/privacy-manager",
    ];
    for (const path of routes) {
      const r = await request(app).get(path).expect(200);
      assert.match(r.text, /id="root"/);
    }
    await request(app).get("/api/nonexistent").expect(404);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
