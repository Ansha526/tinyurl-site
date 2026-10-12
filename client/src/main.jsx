import React, { useState, useEffect, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import "./styles.css";
const Session = createContext();
async function api(path, body, method = body ? "POST" : "GET") {
  const r = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
const features = [
  [
    "custom-links",
    "Link Editor",
    "✎",
    "Make every link your own",
    "Choose a memorable alias and update the destination from your dashboard.",
  ],
  [
    "link-management",
    "Link Management",
    "▦",
    "Your links, in one place",
    "Search, edit and delete your links in a simple account dashboard.",
  ],
  [
    "branded-links",
    "Branded Links",
    "◎",
    "A familiar look for every link",
    "Use a custom alias with your deployed domain. Custom domain DNS is configured in Railway.",
  ],
  [
    "link-analytics",
    "Short URL Tracking",
    "↗",
    "Understand your link performance",
    "Every successful redirect increments your link’s click count.",
  ],
  [
    "qr-code-generator",
    "QR Code Generator",
    "▣",
    "Take your links into the real world",
    "Generate a downloadable PNG QR code for any public website.",
  ],
  [
    "url-shortener-api",
    "Short URL API",
    "⌘",
    "Build link shortening into your app",
    "Use the Express JSON API to create links programmatically.",
  ],
];
const resources = [
  ["blog", "Blog"],
  ["dev", "For Developers"],
  ["proven-process", "Our Proven Process"],
  ["about-us", "About Us"],
];
const contactPages = [
  ["helpdesk", "Help Desk"],
  ["contact-sales", "Contact Sales"],
  ["freescout", "Contact Support / Report Abuse"],
];
const legal = [
  ["terms", "Terms of Service"],
  ["privacy-policy", "Privacy Policy"],
  ["cookies-policy", "Cookie Policy"],
  ["accessibility", "Accessibility Statement"],
  ["privacy-manager", "Privacy Manager"],
];
function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    api("/auth/me")
      .then((x) => setUser(x.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return (
    <Session.Provider value={{ user, setUser, loading }}>
      <BrowserRouter>
        <ScrollTop />
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app/pricing" element={<Pricing />} />
          <Route path="/app/branded-domains" element={<Domains />} />
          <Route path="/app/features/:slug" element={<Feature />} />
          <Route path="/app/login" element={<Auth />} />
          <Route path="/app/register" element={<Auth register />} />
          <Route path="/app/dashboard" element={<Dashboard />} />
          <Route path="/app/:slug" element={<Info />} />
          <Route
            path="*"
            element={
              <Page title="Page not found">
                <p>That page does not exist.</p>
                <Link className="btn" to="/">
                  Go home
                </Link>
              </Page>
            }
          />
        </Routes>
        <Footer />
        <Cookies />
      </BrowserRouter>
    </Session.Provider>
  );
}
function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${pathname === "/" ? "URL Shortener" : pathname.split("/").pop().replaceAll("-", " ")} | LinkNest`;
  }, [pathname]);
  return null;
}
function Header() {
  const { user, setUser } = useContext(Session),
    [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <header>
      <div className="nav">
        <Link className="logo" to="/">
          LINK<span>NEST</span>
        </Link>
        <button
          className="menu"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
        <nav className={open ? "open" : ""} onClick={() => setOpen(false)}>
          <Link to="/app/pricing">Plans</Link>
          <div className="dropdown">
            <button>Features ▾</button>
            <div className="dropmenu">
              {features.map(([s, t]) => (
                <Link key={s} to={`/app/features/${s}`}>
                  {t}
                </Link>
              ))}
            </div>
          </div>
          <Link to="/app/branded-domains">Domains</Link>
          <div className="dropdown">
            <button>Resources ▾</button>
            <div className="dropmenu">
              {resources.map(([s, t]) => (
                <Link key={s} to={`/app/${s}`}>
                  {t}
                </Link>
              ))}
            </div>
          </div>
          <div className="nav-end">
            {user ? (
              <>
                <Link to="/app/dashboard">My Workspace</Link>
                <button
                  onClick={async () => {
                    try {
                      await api("/auth/logout", {});
                      setUser(null);
                      navigate("/");
                    } catch (e) {
                      alert(e.message);
                    }
                  }}
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/app/login">Log In</Link>
                <Link className="btn" to="/app/register">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
function Page({ title, subtitle, children }) {
  return (
    <main>
      <section className="pagehero">
        <div className="container">
          <span className="eyebrow">YOUR LINKS, ALL TOGETHER.</span>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </section>
      <section className="container pagebody">{children}</section>
    </main>
  );
}
function Shortener({ onCreated = () => {}, initialQr = false }) {
  const [mode, setMode] = useState(initialQr ? "qr" : "short"),
    [url, setUrl] = useState(""),
    [alias, setAlias] = useState(""),
    [result, setResult] = useState(null),
    [qr, setQr] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setQr("");
    try {
      if (mode === "qr") {
        const d = await api("/qr", { url });
        setQr(d.image);
      } else {
        const d = await api("/links", { url, alias });
        setResult(d);
        onCreated(d);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shortener">
      <div className="tabs">
        <button
          className={mode === "short" ? "active" : ""}
          onClick={() => {
            setMode("short");
            setResult(null);
            setQr("");
          }}
        >
          ↗ Create Short Link
        </button>
        <button
          className={mode === "qr" ? "active" : ""}
          onClick={() => {
            setMode("qr");
            setResult(null);
          }}
        >
          ▣ Make a QR Code
        </button>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="long-url">
          ↗ Long URL <em>*</em>
        </label>
        <input
          id="long-url"
          type="url"
          placeholder="Paste long URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          maxLength={4096}
        />
        {mode === "short" && (
          <div className="formrow">
            <div>
              <label htmlFor="domain">◎ Domain</label>
              <input id="domain" value={window.location.host} readOnly />
            </div>
            <span>/</span>
            <div>
              <label htmlFor="alias">✎ Alias (optional)</label>
              <input
                id="alias"
                placeholder="Add alias here"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                minLength={5}
                maxLength={40}
                pattern="[a-zA-Z0-9_-]+"
              />
              <small>At least 5 characters</small>
            </div>
          </div>
        )}
        <button className="btn green full" disabled={busy}>
          {busy
            ? "Working…"
            : mode === "qr"
              ? "Generate QR Code"
              : "Create Link"}
        </button>
        <p className="fineprint">
          Educational project. Please read our{" "}
          <Link to="/app/terms">Terms</Link>,{" "}
          <Link to="/app/privacy-policy">Privacy Policy</Link> and{" "}
          <Link to="/app/cookies-policy">Cookie Policy</Link>.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {result && (
          <div className="result" role="status">
            <strong>Ready to share!</strong>
            <a href={result.shortUrl} target="_blank" rel="noreferrer">
              {result.shortUrl}
            </a>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result.shortUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setError(
                    "Copy unavailable. Select and copy the link manually.",
                  );
                }
              }}
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}
        {qr && (
          <div className="qrresult">
            <img src={qr} alt="QR code for the entered URL" />
            <a className="btn" href={qr} download="link-qr.png">
              Download PNG
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
function Home() {
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("recentLinks") || "[]");
    } catch {
      return [];
    }
  });
  function add(l) {
    const next = [l, ...recent].slice(0, 5);
    setRecent(next);
    localStorage.setItem("recentLinks", JSON.stringify(next));
  }
  return (
    <main>
      <section className="homehero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                ONE LINK. A BETTER WAY TO SHARE.
              </span>
              <h1>
                Long links, simplified.
                <br />
                Your next click starts here.
              </h1>
              <p>
                Turn a crowded URL into a clean, memorable link. Share your work,
                your ideas, and your next launch with LinkNest.
              </p>
              <p>
                Create a custom alias, download a QR code, and keep your links
                together in a workspace built for everyday sharing.
              </p>
              <div className="actions">
                <Link className="btn light" to="/app/pricing">
                  Explore Plans
                </Link>
                <Link className="btn" to="/app/register">
                  Start Creating
                </Link>
              </div>
            </div>
            <Shortener onCreated={add} />
          </div>
          <div className="recent">
            <h3>Your latest creations</h3>
            {recent.length ? (
              recent.map((l) => (
                <div className="recent-item" key={l.code}>
                  <a href={l.shortUrl} target="_blank" rel="noreferrer">
                    {l.shortUrl}
                  </a>
                  <span>{l.url}</span>
                </div>
              ))
            ) : (
              <div className="recent-empty">ⓘ No links yet in your history</div>
            )}
          </div>
        </div>
      </section>
      <section className="section pale">
        <div className="container">
          <h2 className="center">A little link. Plenty of possibilities.</h2>
          <div className="cards">
            {[features[3], features[2], features[5], features[1]].map(
              ([s, t, i, h, p]) => (
                <Link className="featurecard" key={s} to={`/app/features/${s}`}>
                  <div className="icon">{i}</div>
                  <h3>{t}</h3>
                  <p>{p}</p>
                  <span className="textlink">Explore feature →</span>
                </Link>
              ),
            )}
          </div>
        </div>
      </section>
      <section className="section container split">
        <div className="link-art">
          <div className="art-top">YOUR NEXT BIG IDEA</div>
          <div className="art-url">
            https://your-website.com/a/very/long/link
          </div>
          <div className="art-arrow">↓</div>
          <div className="art-short">↗ linknest / big-idea</div>
          <div className="art-chips">
            <span>✓ Easy to share</span>
            <span>✓ Easy to remember</span>
          </div>
        </div>
        <div>
          <span className="eyebrow teal">FROM A LONG URL TO YOUR NEXT BIG IDEA</span>
          <h2>
            Share something great.
            <br />
            Keep the link simple.
          </h2>
          <p>
            From social posts and emails to print campaigns, a short link makes
            every connection feel effortless.
          </p>
          <p>
            Replace long, cluttered URLs with a link your audience can recognize
            and trust.
          </p>
          <div className="actions">
            <Link className="btn" to="/">
              Shorten a Link
            </Link>
            <Link className="btn outline" to="/app/contact-sales">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
      <section className="section navy">
        <div className="container">
          <h2 className="center">Create it. Share it. Keep it organized.</h2>
          <div className="cards three">
            {features.slice(0, 3).map(([s, t, i, h, p]) => (
              <div key={s}>
                <div className="icon">{i}</div>
                <h3>{t}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section container faq">
        <h2 className="center">Questions? Start here.</h2>
        {[
          [
            "What is a URL shortener?",
            "A URL shortener saves a long destination URL and gives you a smaller link that redirects to it.",
          ],
          [
            "How do I shorten a URL for free?",
            "Paste your public HTTP or HTTPS URL into the form above, add an optional alias, and select Shorten Link.",
          ],
          [
            "How does click tracking work?",
            "The backend adds one click each time a short link is successfully opened. These are total redirects, not unique visitors.",
          ],
          [
            "Can I edit my links?",
            "Create an account before shortening a link. Your account links appear in My Workspace, where you can edit or delete them.",
          ],
          [
            "Can I use my own domain?",
            "You can configure a custom domain in Railway. The Domains page explains this project’s supported setup.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <section className="cta">
        <h2>Give your next idea a shorter link.</h2>
        <p>Bring your links together, and make sharing feel simple.</p>
        <Link className="btn light" to="/app/register">
          Start Creating
        </Link>
      </section>
    </main>
  );
}
function Auth({ register = false }) {
  const { user, setUser } = useContext(Session),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  if (user) return <Navigate to="/app/dashboard" />;
  async function submit(e) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const d = await api(`/auth/${register ? "register" : "login"}`, form);
      setUser(d.user);
      navigate("/app/dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title={register ? "Make room for your links" : "Back for your next link?"}
      subtitle="Your links, your workspace. Pick up where you left off."
    >
      <form className="panel authform" onSubmit={submit}>
        <h2>{register ? "Sign Up" : "Log In"}</h2>
        {register && (
          <>
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              required
              maxLength={80}
              autoComplete="name"
            />
          </>
        )}
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={register ? 8 : undefined}
          maxLength={72}
          autoComplete={register ? "new-password" : "current-password"}
        />
        {register && <small>Use 8–72 characters.</small>}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="btn full" disabled={busy}>
          {busy ? "Please wait…" : register ? "Create Account" : "Log In"}
        </button>
        <p>
          {register ? "Already have an account?" : "New here?"}{" "}
          <Link to={register ? "/app/login" : "/app/register"}>
            {register ? "Log in" : "Create an account"}
          </Link>
        </p>
        <small>
          LinkNest is an independent student-built URL shortener.
        </small>
      </form>
    </Page>
  );
}
function Dashboard() {
  const { user, loading } = useContext(Session),
    [links, setLinks] = useState([]),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState(null),
    [url, setUrl] = useState(""),
    [removeCode, setRemoveCode] = useState(null),
    [busy, setBusy] = useState(false),
    [qr, setQr] = useState("");
  async function load() {
    try {
      setLinks((await api("/links")).links);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (user) load();
  }, [user]);
  if (loading) return <Page title="Loading…" />;
  if (!user) return <Navigate to="/app/login" />;
  async function mutate(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title={`Your workspace, ${user.name}`}
      subtitle="Your link workspace. Create something worth sharing."
    >
      <div className="stats">
        <div>
          <strong>{links.length}</strong>
          <span>Total links</span>
        </div>
        <div>
          <strong>{links.reduce((n, l) => n + l.clicks, 0)}</strong>
          <span>Total clicks</span>
        </div>
        <div>
          <strong>{links.filter((l) => l.clicks > 0).length}</strong>
          <span>Links with clicks</span>
        </div>
      </div>
      <div className="dashboard-grid">
        <div>
          <div className="toolbar">
            <h2>My Workspace</h2>
            <button className="btn outline" onClick={load}>
              Refresh counts
            </button>
          </div>
          <label htmlFor="search">Search links</label>
          <input
            id="search"
            placeholder="Search by destination or alias"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="link-list">
            {links
              .filter((l) =>
                `${l.url} ${l.code}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((l) => (
                <article className="panel linkrow" key={l.code}>
                  <a href={l.shortUrl} target="_blank" rel="noreferrer">
                    <strong>{l.shortUrl}</strong>
                  </a>
                  <p>{l.url}</p>
                  <div className="linkmeta">
                    <span>
                      {l.clicks} clicks ·{" "}
                      {new Date(l.createdAt).toLocaleDateString()}
                    </span>
                    <div className="actions">
                      <button
                        disabled={busy}
                        onClick={() => {
                          setEditing(l.code);
                          setUrl(l.url);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          mutate(async () =>
                            setQr(
                              (await api("/qr", { url: l.shortUrl })).image,
                            ),
                          )
                        }
                      >
                        QR
                      </button>
                      <button
                        disabled={busy}
                        className="danger"
                        onClick={() => setRemoveCode(l.code)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {editing === l.code && (
                    <form
                      className="inline-edit"
                      onSubmit={(e) => {
                        e.preventDefault();
                        mutate(async () => {
                          await api(`/links/${l.code}`, { url }, "PATCH");
                          setEditing(null);
                        });
                      }}
                    >
                      <label htmlFor="editurl">New destination URL</label>
                      <input
                        id="editurl"
                        type="url"
                        required
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                      <button className="btn" disabled={busy}>
                        Save
                      </button>
                      <button type="button" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </form>
                  )}
                  {removeCode === l.code && (
                    <div role="alert" className="deleteconfirm">
                      <p>Delete this short link? It will stop redirecting.</p>
                      <button
                        disabled={busy}
                        className="btn red"
                        onClick={() =>
                          mutate(async () => {
                            await api(`/links/${l.code}`, {}, "DELETE");
                            setRemoveCode(null);
                          })
                        }
                      >
                        Confirm delete
                      </button>
                      <button onClick={() => setRemoveCode(null)}>
                        Cancel
                      </button>
                    </div>
                  )}
                </article>
              ))}
            {!links.length && (
              <div className="empty">
                <div className="icon">↗</div>
                <h3>Your first link starts here</h3>
                <p>Create a link with the form. It will appear in this list.</p>
              </div>
            )}
          </div>
          {qr && (
            <div className="panel qrresult">
              <img src={qr} alt="QR code for your short link" />
              <a className="btn" href={qr} download="short-link-qr.png">
                Download QR
              </a>
              <button onClick={() => setQr("")}>Close</button>
            </div>
          )}
        </div>
        <Shortener onCreated={load} />
      </div>
    </Page>
  );
}
function Pricing() {
  return (
    <Page
      title="Pick your space to grow"
      subtitle="Explore a familiar pricing layout. All features in this student project are free to demonstrate."
    >
      <div className="notice">
        Demo pricing only. No payments or subscriptions are collected.
      </div>
      <div className="cards three pricing">
        {[
          [
            "Free",
            "$0",
            "Start sharing smarter",
            [
              "Short links",
              "Custom aliases",
              "QR code downloads",
              "Account dashboard",
            ],
          ],
          [
            "Pro",
            "$9",
            "For your next big idea",
            [
              "Everything in Free",
              "Edit destinations",
              "Click counts",
              "Link search",
            ],
          ],
          [
            "Business",
            "$29",
            "Build connections at scale",
            [
              "Everything in Pro",
              "Developer API documentation",
              "Custom domain setup guide",
              "Contact form",
            ],
          ],
        ].map(([name, price, sub, items], i) => (
          <div className={`panel ${i === 1 ? "featured" : ""}`} key={name}>
            {i === 1 && <span className="badge">MOST POPULAR</span>}
            <h2>{name}</h2>
            <p>{sub}</p>
            <div className="price">
              {price}
              <small> / month</small>
            </div>
            <ul>
              {items.map((t) => (
                <li key={t}>✓ {t}</li>
              ))}
            </ul>
            <Link className="btn full" to="/app/register">
              Try the Free Demo
            </Link>
          </div>
        ))}
      </div>
    </Page>
  );
}
function Domains() {
  return (
    <Page
      title="A link that feels like your brand"
      subtitle="Make each short link feel like a part of your brand."
    >
      <div className="split">
        <div>
          <h2>One domain for your whole application</h2>
          <p>
            By default, your deployed project uses a Railway-provided domain.
            Short links use that same domain with the /s/ prefix.
          </p>
          <ol>
            <li>Deploy this project to Railway.</li>
            <li>Open your service’s Settings → Networking.</li>
            <li>Generate a Railway domain or configure your own domain.</li>
            <li>Set PUBLIC_BASE_URL and CLIENT_ORIGIN to the HTTPS domain.</li>
          </ol>
          <div className="notice">
            Multi-tenant domain registration and domain purchases are outside
            this educational project. You can attach an existing custom domain
            in Railway.
          </div>
          <Link className="btn" to="/app/dev">
            See Developer Guide
          </Link>
        </div>
        <div className="link-art">
          <div className="art-top">MAKE IT MEMORABLE</div>
          <div className="art-short">yourbrand.com / s / launch</div>
          <p>Your links. Your story.</p>
        </div>
      </div>
    </Page>
  );
}
function Feature() {
  const { slug } = useParams();
  const f = features.find((x) => x[0] === slug);
  if (!f) return <Page title="Feature not found" />;
  const [s, t, i, h, p] = f;
  return (
    <Page title={t} subtitle={h}>
      <div className="split">
        <div>
          <div className="icon">{i}</div>
          <h2>{h}</h2>
          <p>{p}</p>
          <p>
            Built with React on the frontend and an Express API backed by
            MongoDB. Create a free account to keep your links together.
          </p>
          <Link
            className="btn"
            to={s === "url-shortener-api" ? "/app/dev" : "/app/register"}
          >
            {s === "url-shortener-api"
              ? "View API Documentation"
              : "Get Started"}
          </Link>
        </div>
        {s === "qr-code-generator" ? (
          <Shortener initialQr />
        ) : (
          <div className="panel">
            <h3>How it works</h3>
            <ol>
              <li>Create an account.</li>
              <li>Paste your destination URL.</li>
              <li>Add a custom alias if you like.</li>
              <li>Share the short link and check its clicks in My Workspace.</li>
            </ol>
            <Link to="/">Try the shortener →</Link>
          </div>
        )}
      </div>
    </Page>
  );
}
function Contact({ title }) {
  const [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Page title={title} subtitle="Tell us what you need help with.">
      <form
        className="panel authform"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          setError("");
          setStatus("");
          try {
            const d = await api(
              "/contact",
              Object.fromEntries(new FormData(form)),
            );
            setStatus(d.message);
            form.reset();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="contactname">Your name</label>
        <input id="contactname" name="name" required maxLength={80} />
        <label htmlFor="contactemail">Email</label>
        <input id="contactemail" name="email" type="email" required />
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          minLength={10}
          maxLength={3000}
        />
        <button className="btn full" disabled={busy}>
          {busy ? "Saving…" : "Send Message"}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {status && (
          <p role="status" className="success">
            {status}
          </p>
        )}
        <small>
          Messages are stored in the database. Email delivery is not configured.
        </small>
      </form>
    </Page>
  );
}
const articles = [
  [
    "short-links",
    "Why shorter links make sharing easier",
    "Readable URLs help your audience recognize and remember what you share.",
  ],
  [
    "qr-codes",
    "From a printed page to a website",
    "QR codes connect printed materials to digital destinations.",
  ],
  [
    "tracking",
    "What click counts can tell you",
    "Total redirects help you compare which links are being opened.",
  ],
];
function Info() {
  const { slug } = useParams();
  const [selected, setSelected] = useState(null);
  if (contactPages.some((x) => x[0] === slug))
    return <Contact title={contactPages.find((x) => x[0] === slug)[1]} />;
  if (slug === "blog")
    return (
      <Page
        title="Inside LinkNest"
        subtitle="Simple ideas for better sharing."
      >
        <div className="cards three">
          {articles.map(([id, t, p]) => (
            <article className="panel" key={id}>
              <div className="icon">↗</div>
              <h2>{t}</h2>
              <p>{p}</p>
              <button
                className="btn outline"
                onClick={() => setSelected(selected === id ? null : id)}
              >
                {selected === id ? "Close article" : "Read article"}
              </button>
              {selected === id && (
                <p>
                  Start with a clear destination, choose a descriptive alias,
                  and test the link before publishing. Use your dashboard to
                  review total clicks. A click is a redirect, so it should not
                  be treated as a unique person or a completed sale.
                </p>
              )}
            </article>
          ))}
        </div>
      </Page>
    );
  if (slug === "dev")
    return (
      <Page
        title="Connect your ideas with our API"
        subtitle="React + Express + MongoDB. One clear API."
      >
        <div className="prose">
          <h2>Create a short link</h2>
          <p>
            Send JSON to POST /api/links. Authentication is optional. Links
            created while logged in belong to that account.
          </p>
          <pre>{`curl -X POST https://YOUR-DOMAIN/api/links \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://example.com","alias":"my-link"}'`}</pre>
          <h2>API endpoints</h2>
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Endpoint</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["POST", "/api/auth/register", "Create account"],
                ["POST", "/api/auth/login", "Start session"],
                ["POST", "/api/auth/logout", "End session"],
                ["GET", "/api/auth/me", "Current account"],
                ["POST", "/api/links", "Create link"],
                ["GET", "/api/links", "List your links"],
                ["PATCH", "/api/links/:code", "Update your destination"],
                ["DELETE", "/api/links/:code", "Delete your link"],
                ["GET", "/s/:code", "Redirect and count click"],
                ["POST", "/api/qr", "Generate QR PNG data URL"],
                ["POST", "/api/contact", "Save message"],
                ["GET", "/api/health", "Health and storage mode"],
              ].map((r) => (
                <tr key={r[1] + r[0]}>
                  {r.map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Account routes use a secure HTTP-only session cookie in production.
            Invalid URLs return 400; duplicate aliases return 409;
            unauthenticated protected routes return 401.
          </p>
        </div>
      </Page>
    );
  if (slug === "about-us" || slug === "proven-process")
    return (
      <Page
        title={
          slug === "about-us"
            ? "Good ideas deserve simple links."
            : "A simple process, from start to share."
        }
        subtitle="An independent full-stack student project inspired by TinyURL."
      >
        <div className="prose">
          <h2>
            {slug === "about-us"
              ? "About this project"
              : "Create. Customize. Share. Measure."}
          </h2>
          <p>
            This educational application demonstrates URL shortening, redirects,
            account authentication, persistent storage, QR generation and link
            management.
          </p>
          <ol>
            <li>React renders the pages and collects form input.</li>
            <li>Express validates the request and stores the destination.</li>
            <li>MongoDB stores account, link and contact records.</li>
            <li>
              The redirect endpoint opens the original destination and increases
              its click count.
            </li>
          </ol>
          <div className="notice">
            This project is not affiliated with TinyURL LLC. It does not claim
            TinyURL’s users, history or commercial services.
          </div>
        </div>
      </Page>
    );
  if (slug === "privacy-manager")
    return (
      <Page title="Privacy Manager">
        <div className="panel prose">
          <p>
            The application uses an essential login cookie and local browser
            storage for recent links and your cookie choice. Optional analytics
            cookies are not installed.
          </p>
          <button
            className="btn"
            onClick={() => {
              localStorage.removeItem("recentLinks");
              localStorage.removeItem("cookieChoice");
              window.location.reload();
            }}
          >
            Clear local history and reset cookie choice
          </button>
        </div>
      </Page>
    );
  const content = {
    terms: [
      "Terms of Service",
      "This is an educational URL-shortening application. Use it only to share lawful public websites. Do not create deceptive, malicious or abusive links. Demo plan prices do not create a paid subscription. Links may be removed by their owners. No uptime or permanent availability is promised.",
    ],
    "privacy-policy": [
      "Privacy Policy",
      "This application stores your name, email address and a hashed password when you register. It stores destination URLs, aliases, creation dates, owner IDs and total redirect counts. Contact messages are stored in the database. Recent links are stored in your browser. No email delivery or third-party analytics is configured. Do not submit sensitive information to this classroom demo.",
    ],
    "cookies-policy": [
      "Cookie Policy",
      "An essential HTTP-only session cookie keeps you logged in. Browser local storage remembers recent links and cookie choices. The demo does not install advertising or optional analytics cookies.",
    ],
    accessibility: [
      "Accessibility Statement",
      "This project uses labeled form fields, keyboard-accessible links and buttons, visible focus states and responsive layouts. Validation errors use alert messages. If you encounter a problem, use the support form to report it.",
    ],
  };
  if (content[slug])
    return (
      <Page title={content[slug][0]}>
        <div className="prose panel">
          <p>{content[slug][1]}</p>
          <small>
            Educational project policy. Update this text before offering a real
            public service.
          </small>
        </div>
      </Page>
    );
  return (
    <Page title="Page not found">
      <Link className="btn" to="/">
        Return Home
      </Link>
    </Page>
  );
}
function Cookies() {
  const [show, setShow] = useState(() => !localStorage.getItem("cookieChoice"));
  if (!show) return null;
  return (
    <aside className="cookie" aria-label="Cookie notice">
      <h3>Cookie Consent</h3>
      <p>
        We use essential storage for sign-in and recent links. Read our{" "}
        <Link to="/app/cookies-policy">Cookie Policy</Link>.
      </p>
      <div className="actions">
        <button
          className="btn outline"
          onClick={() => {
            localStorage.setItem("cookieChoice", "necessary");
            setShow(false);
          }}
        >
          Only Necessary
        </button>
        <button
          className="btn"
          onClick={() => {
            localStorage.setItem("cookieChoice", "accepted");
            setShow(false);
          }}
        >
          Accept
        </button>
      </div>
    </aside>
  );
}
function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footergrid">
          <div>
            <Link className="logo" to="/">
              LINK<span>NEST</span>
            </Link>
            <p>
              Small links.
              <br />
              Clear connections.
            </p>
          </div>
          {[
            ["Features", features.map((x) => [x[0], x[1]]), "features/"],
            ["Resources", resources, ""],
            ["Contact Us", contactPages, ""],
            ["Legal", legal, ""],
          ].map(([title, items, prefix]) => (
            <div key={title}>
              <h3>{title}</h3>
              {items.map(([s, t]) => (
                <Link key={s} to={`/app/${prefix}${s}`}>
                  {t}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="footerbottom">
          <span>© {new Date().getFullYear()} LinkNest</span>
          <span>
            Built for learning · Made for simpler sharing
          </span>
        </div>
      </div>
    </footer>
  );
}
createRoot(document.getElementById("root")).render(<App />);
