import { pgTable, text, serial, integer, timestamp, varchar, json, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoData: text("logo_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({ id: true, createdAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull().default(""),
  role: text("role").notNull().default("member"), // "manager" | "member" | "senior_manager" | "auditor" | "donor"
  email: text("email"),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// ── Session store (connect-pg-simple) ─────────────────────────────────────────
// This table MUST remain in the schema so push-force never drops it.
export const sessionTable = pgTable("session", {
  sid:    varchar("sid").notNull().primaryKey(),
  sess:   json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, t => [index("IDX_session_expire").on(t.expire)]);
