import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createStore } from "./store.js";
import { createApp } from "./app.js";
const production = process.env.NODE_ENV === "production";
if (
  production &&
  (!process.env.MONGODB_URI ||
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32 ||
    !process.env.PUBLIC_BASE_URL)
)
  throw new Error(
    "Production requires MONGODB_URI, PUBLIC_BASE_URL and JWT_SECRET (32+ characters).",
  );
const store = await createStore(process.env.MONGODB_URI);
const app = createApp(store, {
  secret: process.env.JWT_SECRET || randomBytes(32).toString("hex"),
  production,
  origin:
    process.env.CLIENT_ORIGIN ||
    process.env.PUBLIC_BASE_URL ||
    "http://localhost:5173",
  baseUrl: process.env.PUBLIC_BASE_URL || "",
});
app.listen(process.env.PORT || 5000, "0.0.0.0", () =>
  console.log(
    `URL shortener listening on port ${process.env.PORT || 5000}; database: ${store.mode}`,
  ),
);
