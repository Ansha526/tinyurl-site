import mongoose from "mongoose";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export async function createStore(uri, file = "data/demo.json") {
  if (uri) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const User =
      mongoose.models.User ||
      mongoose.model(
        "User",
        new mongoose.Schema({
          name: String,
          email: { type: String, unique: true },
          password: String,
        }),
      );
    const Link =
      mongoose.models.Link ||
      mongoose.model(
        "Link",
        new mongoose.Schema({
          url: String,
          code: { type: String, unique: true },
          owner: String,
          clicks: { type: Number, default: 0 },
          createdAt: { type: Date, default: Date.now },
        }),
      );
    const Message =
      mongoose.models.Message ||
      mongoose.model(
        "Message",
        new mongoose.Schema({
          name: String,
          email: String,
          message: String,
          createdAt: { type: Date, default: Date.now },
        }),
      );
    await Promise.all([User.init(), Link.init()]);
    return {
      mode: "mongodb",
      userByEmail: (email) => User.findOne({ email }).lean(),
      userById: (id) =>
        mongoose.isValidObjectId(id) ? User.findById(id).lean() : null,
      addUser: (u) => User.create(u),
      addLink: (l) => Link.create(l),
      link: (code) => Link.findOne({ code }).lean(),
      list: (owner) => Link.find({ owner }).sort({ createdAt: -1 }).lean(),
      update: (code, owner, url) =>
        Link.findOneAndUpdate({ code, owner }, { url }, { new: true }).lean(),
      remove: (code, owner) => Link.findOneAndDelete({ code, owner }).lean(),
      click: (code) =>
        Link.findOneAndUpdate(
          { code },
          { $inc: { clicks: 1 } },
          { new: true },
        ).lean(),
      message: (m) => Message.create(m),
    };
  }
  let db = { users: [], links: [], messages: [] };
  try {
    db = JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  let queue = Promise.resolve();
  const save = () => {
    const snapshot = JSON.stringify(db, null, 2);
    queue = queue.then(async () => {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, snapshot);
    });
    return queue;
  };
  const add = async (kind, item, key) => {
    if (key && db[kind].some((x) => x[key] === item[key])) {
      const e = new Error("Duplicate");
      e.code = 11000;
      throw e;
    }
    const v = {
      ...item,
      _id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    db[kind].push(v);
    await save();
    return v;
  };
  return {
    mode: "local-demo",
    userByEmail: async (email) => db.users.find((u) => u.email === email),
    userById: async (id) => db.users.find((u) => u._id === id),
    addUser: (u) => add("users", u, "email"),
    addLink: (l) => add("links", { ...l, clicks: 0 }, "code"),
    link: async (code) => db.links.find((l) => l.code === code),
    list: async (owner) =>
      db.links.filter((l) => l.owner === owner).toReversed(),
    update: async (code, owner, url) => {
      const l = db.links.find((l) => l.code === code && l.owner === owner);
      if (l) {
        l.url = url;
        await save();
      }
      return l;
    },
    remove: async (code, owner) => {
      const i = db.links.findIndex((l) => l.code === code && l.owner === owner);
      if (i < 0) return null;
      const [l] = db.links.splice(i, 1);
      await save();
      return l;
    },
    click: async (code) => {
      const l = db.links.find((l) => l.code === code);
      if (l) {
        l.clicks++;
        await save();
      }
      return l;
    },
    message: (m) => add("messages", m),
  };
}
