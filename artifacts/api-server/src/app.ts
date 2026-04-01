import express, { type Express } from "express";
import cors from "cors";
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

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store backed by PostgreSQL
const PgStore = ConnectPgSimple(session);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET ?? "pathways-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// Serve generated business model images
app.use("/api/business-model-images", express.static(path.join(process.cwd(), "public", "business-model-images")));

// Serve uploaded strategy documents
app.use("/api/strategy-documents", express.static(path.join(process.cwd(), "public", "strategy-documents")));

app.use("/api", router);

export default app;
