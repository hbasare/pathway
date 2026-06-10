import { pgTable, text, serial, integer, real, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable, usersTable } from "./auth";

export const portfoliosTable = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPortfolioSchema = createInsertSchema(portfoliosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfoliosTable.$inferSelect;

export const theoriesTable = pgTable("theories", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").references(() => portfoliosTable.id, { onDelete: "set null" }),
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
  systemicChangeFramework: text("systemic_change_framework"), // 'aaer' | 'msr' | 'oh' | 'msc' | null
  interventionStartYear: integer("intervention_start_year"),
  interventionEndYear: integer("intervention_end_year"),
  periodGranularity: text("period_granularity").default("annual"), // 'annual' | 'biannual' | 'quarterly'
  pilotDuration: text("pilot_duration").default("none"), // 'none' | '3mo' | '6mo' | '1yr'
  enabledStages: text("enabled_stages").default("adopt,adapt,expand,respond"), // comma-sep subset of the 4 AAER stages
  periodStageMap: text("period_stage_map").default("{}"), // JSON: Record<periodLabel, stageValue>
  customQuestions: text("custom_questions").default("{}"), // JSON: Record<stageValue, CustomQuestion[]>
  pilotPeriods: text("pilot_periods").default("[]"), // JSON: string[] — explicit list of pilot period labels
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
  directBeneficiaries: text("direct_beneficiaries").notNull().default(""),
  indirectBeneficiaries: text("indirect_beneficiaries").notNull().default(""),
  pathway: text("pathway"), // 'direct' | 'indirect' | null
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
  startAnchor: text("start_anchor"),
  endAnchor: text("end_anchor"),
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

export const theoryDocumentsTable = pgTable("theory_documents", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").notNull().references(() => theoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  objectPath: text("object_path").notNull(),
  contentType: text("content_type").notNull().default(""),
  size: integer("size").notNull().default(0),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertTheoryDocumentSchema = createInsertSchema(theoryDocumentsTable).omit({ id: true, uploadedAt: true });
export type InsertTheoryDocument = z.infer<typeof insertTheoryDocumentSchema>;
export type TheoryDocument = typeof theoryDocumentsTable.$inferSelect;

// ── Support Calculation Year Rows ─────────────────────────────────────────────
export const indicatorScYearsTable = pgTable("indicator_sc_years", {
  id: serial("id").primaryKey(),
  indicatorId: integer("indicator_id").notNull().references(() => componentIndicatorsTable.id, { onDelete: "cascade" }),
  year: text("year").notNull().default(""),
  target: text("target").notNull().default(""),
  targetNotes: text("target_notes").notNull().default(""),
  actual: text("actual").notNull().default(""),
  actualDate: text("actual_date").notNull().default(""),
  actualNotes: text("actual_notes").notNull().default(""),
  notes: text("notes").notNull().default(""),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIndicatorScYearSchema = createInsertSchema(indicatorScYearsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIndicatorScYear = z.infer<typeof insertIndicatorScYearSchema>;
export type IndicatorScYear = typeof indicatorScYearsTable.$inferSelect;

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

// ── Systemic Change Entries ───────────────────────────────────────────────────
export const systemicChangesTable = pgTable("systemic_changes", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").notNull().references(() => theoriesTable.id, { onDelete: "cascade" }),
  framework: text("framework").notNull().default(""), // 'aaer' | 'msr' | 'oh' | 'msc'
  dimension: text("dimension").notNull().default(""),
  description: text("description").notNull().default(""),
  changeObserved: text("change_observed").notNull().default(""),
  level: text("level").notNull().default("meso"),
  status: text("status").notNull().default("emerging"),
  frameworkTag: text("framework_tag").notNull().default(""), // AAER stage, MSR dimension, OH scope, MSC domain
  periodLabel: text("period_label").notNull().default(""),
  stageData: text("stage_data").notNull().default("{}"), // JSON: stage-specific guided answers
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSystemicChangeSchema = createInsertSchema(systemicChangesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSystemicChange = z.infer<typeof insertSystemicChangeSchema>;
export type SystemicChange = typeof systemicChangesTable.$inferSelect;
export type BusinessModelActor = typeof businessModelActorsTable.$inferSelect;

// ─── Theory Locations ─────────────────────────────────────────────────────────
export const theoryLocationsTable = pgTable("theory_locations", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").notNull().references(() => theoriesTable.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull().default(""),
  country: text("country").notNull().default(""),
  countryCode: text("country_code").notNull().default(""),
  adminLevel1: text("admin_level1").notNull().default(""),
  adminLevel2: text("admin_level2").notNull().default(""),
  lat: real("lat"),
  lng: real("lng"),
  boundaryGeoJson: text("boundary_geojson").notNull().default(""),
  level: text("level").notNull().default("country"),
  nominatimId: text("nominatim_id").notNull().default(""),
  icon: text("icon").notNull().default("general"),
  figureLabel: text("figure_label").notNull().default(""),
  targetFigure: text("target_figure").notNull().default(""),
  actualFigure: text("actual_figure").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTheoryLocationSchema = createInsertSchema(theoryLocationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTheoryLocation = z.infer<typeof insertTheoryLocationSchema>;
export type TheoryLocation = typeof theoryLocationsTable.$inferSelect;

// ─── Theory Assignments ────────────────────────────────────────────────────────
// Maps team members (role: "member") to the specific theories they manage.
// Members can edit only their assigned theories; all others are view-only.
export const theoryAssignmentsTable = pgTable("theory_assignments", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").notNull().references(() => theoriesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.theoryId, t.userId)]);

export type TheoryAssignment = typeof theoryAssignmentsTable.$inferSelect;
