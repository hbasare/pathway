import { pgTable, text, serial, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const theoriesTable = pgTable("theories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  // About Intervention fields
  market: text("market").default(""),
  interventionCode: text("intervention_code").default(""),
  interventionTitle: text("intervention_title").default(""),
  manager: text("manager").default(""),
  mrmResponsible: text("mrm_responsible").default(""),
  targetBeneficiary: text("target_beneficiary").default(""),
  privateSectorPartners: text("private_sector_partners").default(""),
  publicSectorPartners: text("public_sector_partners").default(""),
  serviceProviders: text("service_providers").default(""),
  strategy: text("strategy").default(""),
  interventionStory: text("intervention_story").default(""),
  womenEconomicEmpowerment: text("women_economic_empowerment").default(""),
  climateSmart: text("climate_smart").default(""),
  displacement: text("displacement").default(""),
  contributionOfOtherProjects: text("contribution_of_other_projects").default(""),
  // Strategy document
  strategyDocumentPath: text("strategy_document_path").default(""),
  strategyDocumentName: text("strategy_document_name").default(""),
  // Business model
  businessModelImagePath: text("business_model_image_path").default(""),
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
  baselineDate: text("baseline_date").default(""),
  baselineFigure: text("baseline_figure").default(""),
  qualitativeQuestions: text("qualitative_questions").default(""),
  quantitativeQuestions: text("quantitative_questions").default(""),
  willBeAddressed: boolean("will_be_addressed").notNull().default(false),
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

export const componentIndicatorsTable = pgTable("component_indicators", {
  id: serial("id").primaryKey(),
  componentId: integer("component_id").notNull().references(() => componentsTable.id, { onDelete: "cascade" }),
  theoryId: integer("theory_id").notNull().references(() => theoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  // Target group
  targetDate: text("target_date").default(""),
  targetFigure: text("target_figure").default(""),
  targetExplanation: text("target_explanation").default(""),
  targetSourceOfInformation: text("target_source_of_information").default(""),
  targetDateLastReviewed: text("target_date_last_reviewed").default(""),
  targetNotes: text("target_notes").default(""),
  // Actual group
  actualDate: text("actual_date").default(""),
  actualFigure: text("actual_figure").default(""),
  actualExplanation: text("actual_explanation").default(""),
  actualSourceOfInformation: text("actual_source_of_information").default(""),
  actualDateLastReviewed: text("actual_date_last_reviewed").default(""),
  actualNotes: text("actual_notes").default(""),
  // Baseline group
  baselineDate: text("baseline_date").default(""),
  baselineFigure: text("baseline_figure").default(""),
  baselineExplanation: text("baseline_explanation").default(""),
  baselineSourceOfInformation: text("baseline_source_of_information").default(""),
  baselineDateLastReviewed: text("baseline_date_last_reviewed").default(""),
  baselineNotes: text("baseline_notes").default(""),
  // Measurement questions — per group
  targetQualitativeQuestion: text("target_qualitative_question").default(""),
  targetQuantitativeQuestion: text("target_quantitative_question").default(""),
  actualQualitativeQuestion: text("actual_qualitative_question").default(""),
  actualQuantitativeQuestion: text("actual_quantitative_question").default(""),
  baselineQualitativeQuestion: text("baseline_qualitative_question").default(""),
  baselineQuantitativeQuestion: text("baseline_quantitative_question").default(""),
  calculationsNotes: text("calculations_notes").notNull().default(""),
  measurementFrequency: text("measurement_frequency").notNull().default(""),
  scTarget: text("sc_target").notNull().default(""),
  scTargetNotes: text("sc_target_notes").notNull().default(""),
  scActual: text("sc_actual").notNull().default(""),
  scActualNotes: text("sc_actual_notes").notNull().default(""),
  scNotes: text("sc_notes").notNull().default(""),
  showOnDiagram: boolean("show_on_diagram").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertComponentIndicatorSchema = createInsertSchema(componentIndicatorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertComponentIndicator = z.infer<typeof insertComponentIndicatorSchema>;
export type ComponentIndicator = typeof componentIndicatorsTable.$inferSelect;

export const theoryNotesUpdatesTable = pgTable("theory_notes_updates", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").notNull().references(() => theoriesTable.id, { onDelete: "cascade" }),
  activityChange: text("activity_change").notNull().default(""),
  date: text("date").notNull().default(""),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTheoryNoteUpdateSchema = createInsertSchema(theoryNotesUpdatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTheoryNoteUpdate = z.infer<typeof insertTheoryNoteUpdateSchema>;
export type TheoryNoteUpdate = typeof theoryNotesUpdatesTable.$inferSelect;

export const theoryRiskAnalysesTable = pgTable("theory_risk_analyses", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").notNull().references(() => theoriesTable.id, { onDelete: "cascade" }),
  risk: text("risk").notNull().default(""),
  likelihood: text("likelihood").notNull().default(""),
  mitigationStrategy: text("mitigation_strategy").notNull().default(""),
  notes: text("notes").notNull().default(""),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTheoryRiskAnalysisSchema = createInsertSchema(theoryRiskAnalysesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTheoryRiskAnalysis = z.infer<typeof insertTheoryRiskAnalysisSchema>;
export type TheoryRiskAnalysis = typeof theoryRiskAnalysesTable.$inferSelect;

export const businessModelActorsTable = pgTable("business_model_actors", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").notNull().references(() => theoriesTable.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  actorName: text("actor_name").notNull().default(""),
  currentBehaviour: text("current_behaviour").notNull().default(""),
  expectedBehaviourChange: text("expected_behaviour_change").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBusinessModelActorSchema = createInsertSchema(businessModelActorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBusinessModelActor = z.infer<typeof insertBusinessModelActorSchema>;
export type BusinessModelActor = typeof businessModelActorsTable.$inferSelect;
