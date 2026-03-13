import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const theoriesTable = pgTable("theories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTheorySchema = createInsertSchema(theoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTheory = z.infer<typeof insertTheorySchema>;
export type Theory = typeof theoriesTable.$inferSelect;

export const componentsTable = pgTable("components", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").notNull().references(() => theoriesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // input | activity | output | outcome | impact
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  indicators: text("indicators").notNull().default(""),
  assumptions: text("assumptions").notNull().default(""),
  targetDate: text("target_date").default(""),
  targetFigure: text("target_figure").default(""),
  actualDate: text("actual_date").default(""),
  actualFigure: text("actual_figure").default(""),
  qualitativeQuestions: text("qualitative_questions").default(""),
  quantitativeQuestions: text("quantitative_questions").default(""),
  positionX: real("position_x").notNull().default(0),
  positionY: real("position_y").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertComponentSchema = createInsertSchema(componentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertComponent = z.infer<typeof insertComponentSchema>;
export type Component = typeof componentsTable.$inferSelect;

export const connectionsTable = pgTable("connections", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").notNull().references(() => theoriesTable.id, { onDelete: "cascade" }),
  fromComponentId: integer("from_component_id").notNull().references(() => componentsTable.id, { onDelete: "cascade" }),
  toComponentId: integer("to_component_id").notNull().references(() => componentsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConnectionSchema = createInsertSchema(connectionsTable).omit({ id: true, createdAt: true });
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connectionsTable.$inferSelect;
