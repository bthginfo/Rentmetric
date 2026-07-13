import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const membershipRole = pgEnum("membership_role", ["owner", "admin", "manager", "accounting", "viewer"]);
export const taskStatus = pgEnum("task_status", ["open", "done", "dismissed"]);
export const jobStatus = pgEnum("job_status", ["queued", "running", "completed", "failed"]);
export const sourceStatus = pgEnum("source_status", ["pending_review", "active", "superseded", "rejected"]);
export const unitStatus = pgEnum("unit_status", ["vacant", "occupied", "owner_occupied", "renovation"]);
export const importStatus = pgEnum("rent_index_import_status", ["uploaded", "processing", "needs_review", "approved", "failed"]);
export const notificationStatus = pgEnum("notification_status", ["unread", "read", "archived"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  locale: text("locale").notNull().default("de-DE"),
  currency: text("currency").notNull().default("EUR"),
  ...timestamps,
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  email: text("email"),
  ...timestamps,
}, (table) => [uniqueIndex("users_username_unique").on(table.username)]);

export const organizationMemberships = pgTable("organization_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: membershipRole("role").notNull().default("owner"),
  ...timestamps,
}, (table) => [uniqueIndex("membership_org_user_unique").on(table.organizationId, table.userId)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("sessions_token_hash_unique").on(table.tokenHash), index("sessions_user_idx").on(table.userId)]);

export const authAttempts = pgTable("auth_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyHash: text("key_hash").notNull(),
  succeeded: boolean("succeeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("auth_attempts_key_created_idx").on(table.keyHash, table.createdAt)]);

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  street: text("street").notNull(),
  houseNumber: text("house_number").notNull(),
  postalCode: text("postal_code").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  yearBuilt: integer("year_built"),
  ...timestamps,
}, (table) => [index("properties_org_idx").on(table.organizationId)]);

export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  floor: text("floor"),
  areaSqm: integer("area_sqm"),
  roomsTimesTen: integer("rooms_times_ten"),
  status: unitStatus("status").notNull().default("vacant"),
  targetColdRentCents: integer("target_cold_rent_cents"),
  utilityEstimateCents: integer("utility_estimate_cents"),
  condition: text("condition"),
  heatingType: text("heating_type"),
  energySource: text("energy_source"),
  bathroom: text("bathroom"),
  flooring: text("flooring"),
  hasBalcony: boolean("has_balcony").notNull().default(false),
  hasFittedKitchen: boolean("has_fitted_kitchen").notNull().default(false),
  hasElevator: boolean("has_elevator").notNull().default(false),
  isAccessible: boolean("is_accessible").notNull().default(false),
  parkingSpaces: integer("parking_spaces").notNull().default(0),
  notes: text("notes"),
  ...timestamps,
}, (table) => [index("units_org_property_idx").on(table.organizationId, table.propertyId)]);

export const propertyImages = pgTable("property_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  blobPathname: text("blob_pathname").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  altText: text("alt_text"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [index("property_images_org_property_idx").on(table.organizationId, table.propertyId), uniqueIndex("property_images_blob_unique").on(table.blobPathname)]);

export const renters = pgTable("renters", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  ...timestamps,
}, (table) => [index("renters_org_idx").on(table.organizationId)]);

export const tenancies = pgTable("tenancies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  unitId: uuid("unit_id").notNull().references(() => units.id, { onDelete: "restrict" }),
  renterId: uuid("renter_id").notNull().references(() => renters.id, { onDelete: "restrict" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  coldRentCents: integer("cold_rent_cents").notNull(),
  utilityAdvanceCents: integer("utility_advance_cents").notNull().default(0),
  depositCents: integer("deposit_cents").notNull().default(0),
  lastRentIncreaseAt: timestamp("last_rent_increase_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [index("tenancies_org_idx").on(table.organizationId)]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  tenancyId: uuid("tenancy_id").notNull().references(() => tenancies.id, { onDelete: "restrict" }),
  amountCents: integer("amount_cents").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  reference: text("reference"),
  ...timestamps,
}, (table) => [index("payments_org_due_idx").on(table.organizationId, table.dueAt)]);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  blobKey: text("blob_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedByRenter: boolean("uploaded_by_renter").notNull().default(false),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [index("documents_org_idx").on(table.organizationId)]);

export const rentIndexSources = pgTable("rent_index_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  municipality: text("municipality").notNull(),
  providerType: text("provider_type").notNull(),
  sourceUrl: text("source_url"),
  version: text("version").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  status: sourceStatus("status").notNull().default("pending_review"),
  rules: jsonb("rules").notNull(),
  checksum: text("checksum").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("rent_index_source_version_unique").on(table.organizationId, table.municipality, table.version)]);

export const rentIndexImports = pgTable("rent_index_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  municipality: text("municipality").notNull(),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  blobPathname: text("blob_pathname").notNull(),
  sourceType: text("source_type").notNull().default("manual_upload"),
  sourceUrl: text("source_url"),
  externalDatasetId: text("external_dataset_id"),
  externalResourceId: text("external_resource_id"),
  detectedFormat: text("detected_format"),
  status: importStatus("status").notNull().default("uploaded"),
  extractedData: jsonb("extracted_data"),
  warnings: jsonb("warnings"),
  error: text("error"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [index("rent_index_imports_org_created_idx").on(table.organizationId, table.createdAt), uniqueIndex("rent_index_imports_blob_unique").on(table.blobPathname)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  type: text("type").notNull().default("info"),
  status: notificationStatus("status").notNull().default("unread"),
  deduplicationKey: text("deduplication_key"),
  metadata: jsonb("metadata"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("notifications_org_status_idx").on(table.organizationId, table.status), uniqueIndex("notifications_org_dedupe_unique").on(table.organizationId, table.deduplicationKey)]);

export const rentAssessments = pgTable("rent_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  tenancyId: uuid("tenancy_id").notNull().references(() => tenancies.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => rentIndexSources.id, { onDelete: "restrict" }),
  input: jsonb("input").notNull(),
  result: jsonb("result").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [index("rent_assessments_org_idx").on(table.organizationId)]);

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  ruleId: text("rule_id"),
  deduplicationKey: text("deduplication_key"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  status: taskStatus("status").notNull().default("open"),
  severity: text("severity").notNull().default("info"),
  sourceType: text("source_type"),
  sourceId: uuid("source_id"),
  metadata: jsonb("metadata"),
  ...timestamps,
}, (table) => [index("tasks_org_due_idx").on(table.organizationId, table.dueAt), uniqueIndex("tasks_org_dedupe_unique").on(table.organizationId, table.deduplicationKey)]);

export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  tenancyId: uuid("tenancy_id").notNull().references(() => tenancies.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  permissions: jsonb("permissions").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex("share_links_token_hash_unique").on(table.tokenHash), index("share_links_org_idx").on(table.organizationId)]);

export const backgroundJobs = pgTable("background_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: jobStatus("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  error: text("error"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex("jobs_idempotency_unique").on(table.idempotencyKey), index("jobs_dispatch_idx").on(table.status, table.nextRunAt)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  changes: jsonb("changes"),
  requestId: text("request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("audit_org_created_idx").on(table.organizationId, table.createdAt)]);
