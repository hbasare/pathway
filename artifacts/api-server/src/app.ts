import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import router from "./routes";

declare module "express-session" {
  interface SessionData {
    userId: number;
    orgId: number;
    role: string;
    username: string;
    displayName: string;
    orgName: string;
  }
}

const isProduction = process.env.NODE_ENV === "production";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (isProduction) {
    console.error("FATAL: SESSION_SECRET environment variable must be set in production. Exiting.");
    process.exit(1);
  } else {
    console.warn("WARNING: SESSION_SECRET is not set. Using an insecure development fallback. Never deploy without a real secret.");
  }
}

const app: Express = express();

// Trust the first proxy (Replit's reverse proxy) so req.ip is the real client IP
// and secure cookies work over HTTPS.
app.set("trust proxy", 1);

// Security headers — disabling CSP so Vite / React dev tools are not blocked;
// all other protections (X-Frame-Options, HSTS, referrer, etc.) remain active.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS: allow the same origin or Replit preview domains; always require credentials.
const allowedOriginPattern = /\.replit\.dev$|\.repl\.co$|^http:\/\/localhost/;
app.use(
  cors({
    origin: (origin, cb) => {
      // Same-origin requests have no Origin header — always allow.
      if (!origin) return cb(null, true);
      if (allowedOriginPattern.test(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Session store backed by PostgreSQL
const PgStore = ConnectPgSimple(session);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: sessionSecret ?? "pathways-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    name: "pathways.sid",
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: isProduction,          // HTTPS-only in production
      sameSite: isProduction ? "strict" : "lax",
    },
  })
);

// Serve generated business model images
app.use("/api/business-model-images", express.static(path.join(process.cwd(), "public", "business-model-images")));

// Serve uploaded strategy documents
app.use("/api/strategy-documents", express.static(path.join(process.cwd(), "public", "strategy-documents")));

app.use("/api", router);

export default app;
