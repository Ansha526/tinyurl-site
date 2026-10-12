import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
export function validUrl(value) {
  try {
    const u = new URL(value);
    if (
      !["http:", "https:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      !u.hostname.includes(".")
    )
      return null;
    return u.href;
  } catch {
    return null;
  }
}
export function createApp(
  store,
  {
    secret,
    production = false,
    origin = "http://localhost:5173",
    baseUrl = "",
  } = {},
) {
  if (!secret) throw new Error("JWT secret required");
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 150,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60000,
      limit: 40,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  const safe = (u) => ({ id: String(u._id), name: u.name, email: u.email });
  const cookie = {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    maxAge: 7 * 86400000,
    path: "/",
  };
  const tokenUser = (req) => {
    try {
      return jwt.verify(req.cookies.session, secret).id;
    } catch {
      return null;
    }
  };
  const auth = (req, res, next) => {
    req.userId = tokenUser(req);
    if (!req.userId)
      return res.status(401).json({ error: "Please log in first." });
    next();
  };
  app.use("/api", (req, res, next) => {
    if (["POST", "PATCH", "DELETE"].includes(req.method)) {
      if (
        req.headers.origin &&
        ![origin, baseUrl].filter(Boolean).includes(req.headers.origin)
      )
        return res.status(403).json({ error: "Origin not allowed." });
      if (!req.is("application/json"))
        return res.status(415).json({ error: "Send application/json." });
    }
    next();
  });
  const short = (req, code) =>
    `${baseUrl || `${req.protocol}://${req.get("host")}`}/s/${code}`;
  const publicLink = (req, l) => ({
    code: l.code,
    url: l.url,
    clicks: l.clicks,
    createdAt: l.createdAt,
    shortUrl: short(req, l.code),
  });
  app.get("/api/health", (req, res) =>
    res.json({ ok: true, database: store.mode }),
  );
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    const e = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 80 ||
      !/^\S+@\S+\.\S+$/.test(e) ||
      e.length > 254 ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 72
    )
      return res
        .status(400)
        .json({
          error: "Enter a name, valid email and password of 8–72 characters.",
        });
    const u = await store.addUser({
      name: name.trim(),
      email: e,
      password: await bcrypt.hash(password, 12),
    });
    res
      .cookie(
        "session",
        jwt.sign({ id: String(u._id) }, secret, { expiresIn: "7d" }),
        cookie,
      )
      .status(201)
      .json({ user: safe(u) });
  });
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const u =
      typeof email === "string"
        ? await store.userByEmail(email.trim().toLowerCase())
        : null;
    if (
      !u ||
      typeof password !== "string" ||
      !(await bcrypt.compare(password, u.password))
    )
      return res.status(401).json({ error: "Email or password is incorrect." });
    res
      .cookie(
        "session",
        jwt.sign({ id: String(u._id) }, secret, { expiresIn: "7d" }),
        cookie,
      )
      .json({ user: safe(u) });
  });
  app.post("/api/auth/logout", (req, res) =>
    res.clearCookie("session", cookie).json({ ok: true }),
  );
  app.get("/api/auth/me", auth, async (req, res) => {
    const u = await store.userById(req.userId);
    if (!u) return res.status(401).json({ error: "Session expired." });
    res.json({ user: safe(u) });
  });
  app.post("/api/links", async (req, res) => {
    const url =
      typeof req.body.url === "string" && req.body.url.length <= 4096
        ? validUrl(req.body.url)
        : null;
    if (!url)
      return res
        .status(400)
        .json({ error: "Enter a valid public HTTP or HTTPS URL." });
    const alias = req.body.alias || "";
    if (
      typeof alias !== "string" ||
      (alias && !/^[a-zA-Z0-9_-]{5,40}$/.test(alias))
    )
      return res
        .status(400)
        .json({
          error: "Alias must be 5–40 letters, numbers, hyphens or underscores.",
        });
    for (let i = 0; i < 5; i++) {
      try {
        const l = await store.addLink({
          url,
          code: alias || randomBytes(6).toString("base64url"),
          owner: tokenUser(req),
        });
        return res.status(201).json(publicLink(req, l));
      } catch (e) {
        if (e.code !== 11000) throw e;
        if (alias)
          return res
            .status(409)
            .json({ error: "That alias is already taken." });
      }
    }
    res.status(503).json({ error: "Please try again." });
  });
  app.get("/api/links", auth, async (req, res) =>
    res.json({
      links: (await store.list(req.userId)).map((l) => publicLink(req, l)),
    }),
  );
  app.patch("/api/links/:code", auth, async (req, res) => {
    const url =
      typeof req.body.url === "string" && req.body.url.length <= 4096
        ? validUrl(req.body.url)
        : null;
    if (!url) return res.status(400).json({ error: "Invalid URL." });
    const l = await store.update(req.params.code, req.userId, url);
    if (!l) return res.status(404).json({ error: "Link not found." });
    res.json(publicLink(req, l));
  });
  app.delete("/api/links/:code", auth, async (req, res) => {
    const l = await store.remove(req.params.code, req.userId);
    if (!l) return res.status(404).json({ error: "Link not found." });
    res.json({ ok: true });
  });
  app.post("/api/qr", async (req, res) => {
    const url =
      typeof req.body.url === "string" && req.body.url.length <= 4096
        ? validUrl(req.body.url)
        : null;
    if (!url) return res.status(400).json({ error: "Enter a valid URL." });
    res.json({ image: await QRCode.toDataURL(url, { width: 320, margin: 2 }) });
  });
  app.post("/api/contact", async (req, res) => {
    const { name, email, message } = req.body;
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 80 ||
      typeof email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      email.length > 254 ||
      typeof message !== "string" ||
      message.trim().length < 10 ||
      message.length > 3000
    )
      return res
        .status(400)
        .json({
          error:
            "Enter your name, valid email and a message of 10–3000 characters.",
        });
    await store.message({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    res
      .status(201)
      .json({
        message: "Message saved. This educational demo does not send email.",
      });
  });
  app.get("/s/:code", async (req, res) => {
    const l = await store.click(req.params.code);
    if (!l) return res.status(404).send("This short link does not exist.");
    res.set("Cache-Control", "no-store").redirect(302, l.url);
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  const dist = fileURLToPath(new URL("../client/dist/", import.meta.url));
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*path}", (req, res) => res.sendFile(`${dist}/index.html`));
  }
  app.use((err, req, res, next) => {
    if (err.code === 11000)
      return res
        .status(409)
        .json({ error: "This email or alias already exists." });
    if (err instanceof SyntaxError)
      return res.status(400).json({ error: "Invalid JSON." });
    console.error(err.message);
    res.status(500).json({ error: "Server error. Please try again." });
  });
  return app;
}
