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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const membershipRole = pgEnum("membership_role", [
  "owner",
  "admin",
  "manager",
  "accounting",
  "viewer",
]);
export const taskStatus = pgEnum("task_status", ["open", "done", "dismissed"]);
export const jobStatus = pgEnum("job_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);
export const sourceStatus = pgEnum("source_status", [
  "pending_review",
  "active",
  "superseded",
  "rejected",
]);
export const unitStatus = pgEnum("unit_status", [
  "vacant",
  "occupied",
  "owner_occupied",
  "renovation",
]);
export const importStatus = pgEnum("rent_index_import_status", [
  "uploaded",
  "processing",
  "needs_review",
  "approved",
  "failed",
]);
export const notificationStatus = pgEnum("notification_status", [
  "unread",
  "read",
  "archived",
]);
export const maintenanceStatus = pgEnum("maintenance_status", [
  "open",
  "scheduled",
  "resolved",
]);
export const billingInterval = pgEnum("billing_interval", [
  "one_time",
  "month",
  "year",
]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "manual",
]);
export const portalItemKind = pgEnum("portal_item_kind", ["message", "task"]);
export const portalTaskStatus = pgEnum("portal_task_status", ["open", "done"]);
export const portalEntryAuthor = pgEnum("portal_entry_author", [
  "landlord",
  "renter",
  "system",
]);
export const portalEntryType = pgEnum("portal_entry_type", ["reply", "status"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  locale: text("locale").notNull().default("de-DE"),
  currency: text("currency").notNull().default("EUR"),
  bankAccountHolder: text("bank_account_holder"),
  bankName: text("bank_name"),
  iban: text("iban"),
  bic: text("bic"),
  transferNote: text("transfer_note"),
  rentDueDay: integer("rent_due_day").notNull().default(3),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    email: text("email"),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_username_unique").on(table.username)],
);

export const userProductState = pgTable("user_product_state", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  tourVersion: integer("tour_version").notNull().default(1),
  tourStatus: text("tour_status").notNull().default("pending"),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ...timestamps,
});

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("owner"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("membership_org_user_unique").on(
      table.organizationId,
      table.userId,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyHash: text("key_hash").notNull(),
    succeeded: boolean("succeeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_attempts_key_created_idx").on(table.keyHash, table.createdAt),
  ],
);

export const platformAdmins = pgTable(
  "platform_admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    email: text("email"),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("platform_admins_username_unique").on(table.username),
  ],
);

export const platformAdminSessions = pgTable(
  "platform_admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => platformAdmins.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("platform_admin_sessions_token_unique").on(table.tokenHash),
    index("platform_admin_sessions_admin_idx").on(table.adminId),
  ],
);

export const platformAuditLogs = pgTable(
  "platform_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").references(() => platformAdmins.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("platform_audit_created_idx").on(table.createdAt)],
);

export const billingPlans = pgTable(
  "billing_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    interval: billingInterval("interval").notNull(),
    active: boolean("active").notNull().default(true),
    public: boolean("public").notNull().default(false),
    featureLimits: jsonb("feature_limits")
      .$type<Record<string, number | boolean | string>>()
      .notNull()
      .default({}),
    providerProductId: text("provider_product_id"),
    providerPriceId: text("provider_price_id"),
    ...timestamps,
  },
  (table) => [uniqueIndex("billing_plans_code_unique").on(table.code)],
);

export const organizationSubscriptions = pgTable(
  "organization_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => billingPlans.id, { onDelete: "restrict" }),
    status: subscriptionStatus("status").notNull().default("manual"),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    ...timestamps,
  },
  (table) => [
    index("organization_subscriptions_org_idx").on(table.organizationId),
    index("organization_subscriptions_plan_idx").on(table.planId),
  ],
);

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    street: text("street").notNull(),
    houseNumber: text("house_number").notNull(),
    postalCode: text("postal_code").notNull(),
    city: text("city").notNull(),
    state: text("state"),
    yearBuilt: integer("year_built"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("properties_org_idx").on(table.organizationId)],
);

export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
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
    effectiveConstructionYear: integer("effective_construction_year"),
    modernizationYear: integer("modernization_year"),
    locationCategory: text("location_category"),
    buildingType: text("building_type"),
    unitType: text("unit_type"),
    outdoorAreaTimesTen: integer("outdoor_area_times_ten"),
    bathroomAreaTimesTen: integer("bathroom_area_times_ten"),
    rentIndexFeatures: jsonb("rent_index_features")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("units_org_property_idx").on(table.organizationId, table.propertyId),
  ],
);

export const propertyImages = pgTable(
  "property_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    blobPathname: text("blob_pathname").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    altText: text("alt_text"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("property_images_org_property_idx").on(
      table.organizationId,
      table.propertyId,
    ),
    uniqueIndex("property_images_blob_unique").on(table.blobPathname),
  ],
);

export const renters = pgTable(
  "renters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    ...timestamps,
  },
  (table) => [index("renters_org_idx").on(table.organizationId)],
);

export const tenancies = pgTable(
  "tenancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    renterId: uuid("renter_id")
      .notNull()
      .references(() => renters.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    coldRentCents: integer("cold_rent_cents").notNull(),
    utilityAdvanceCents: integer("utility_advance_cents").notNull().default(0),
    depositCents: integer("deposit_cents").notNull().default(0),
    depositPaidCents: integer("deposit_paid_cents").notNull().default(0),
    depositPaidAt: timestamp("deposit_paid_at", { withTimezone: true }),
    depositReturnedAt: timestamp("deposit_returned_at", { withTimezone: true }),
    rentDueDay: integer("rent_due_day"),
    paymentReference: text("payment_reference"),
    lastRentIncreaseAt: timestamp("last_rent_increase_at", {
      withTimezone: true,
    }),
    ...timestamps,
  },
  (table) => [index("tenancies_org_idx").on(table.organizationId)],
);

export const rentChanges = pgTable(
  "rent_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tenancyId: uuid("tenancy_id")
      .notNull()
      .references(() => tenancies.id, { onDelete: "cascade" }),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
    }).notNull(),
    oldColdRentCents: integer("old_cold_rent_cents").notNull(),
    newColdRentCents: integer("new_cold_rent_cents").notNull(),
    changeType: text("change_type").notNull(),
    reason: text("reason"),
    status: text("status").notNull().default("draft"),
    documentId: uuid("document_id"),
    ...timestamps,
  },
  (table) => [
    index("rent_changes_tenancy_idx").on(
      table.organizationId,
      table.tenancyId,
      table.effectiveFrom,
    ),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tenancyId: uuid("tenancy_id")
      .notNull()
      .references(() => tenancies.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    reference: text("reference"),
    ...timestamps,
  },
  (table) => [
    index("payments_org_due_idx").on(table.organizationId, table.dueAt),
  ],
);

export const bankTransactions = pgTable(
  "bank_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    bookingDate: timestamp("booking_date", { withTimezone: true }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    reference: text("reference"),
    counterparty: text("counterparty"),
    externalId: text("external_id"),
    matchedPaymentId: uuid("matched_payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    confidenceBasisPoints: integer("confidence_basis_points"),
    status: text("status").notNull().default("unmatched"),
    ...timestamps,
  },
  (table) => [
    index("bank_transactions_org_date_idx").on(
      table.organizationId,
      table.bookingDate,
    ),
    uniqueIndex("bank_transactions_org_external_unique").on(
      table.organizationId,
      table.externalId,
    ),
  ],
);

export const maintenanceCases = pgTable(
  "maintenance_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    unitId: uuid("unit_id").references(() => units.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority").notNull().default("normal"),
    category: text("category").notNull().default("repair"),
    assigneeContactId: uuid("assignee_contact_id"),
    estimatedCostCents: integer("estimated_cost_cents"),
    actualCostCents: integer("actual_cost_cents"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    recurrence: text("recurrence"),
    status: maintenanceStatus("status").notNull().default("open"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    reportedByRenter: boolean("reported_by_renter").notNull().default(false),
    portalVisible: boolean("portal_visible").notNull().default(false),
    portalTenancyId: uuid("portal_tenancy_id").references(() => tenancies.id, {
      onDelete: "set null",
    }),
    portalRenterId: uuid("portal_renter_id").references(() => renters.id, {
      onDelete: "set null",
    }),
    portalShareLinkId: uuid("portal_share_link_id"),
    portalReportKey: uuid("portal_report_key"),
    ...timestamps,
  },
  (table) => [
    index("maintenance_org_status_idx").on(table.organizationId, table.status),
    uniqueIndex("maintenance_portal_report_key_unique").on(
      table.organizationId,
      table.portalReportKey,
    ),
  ],
);

export const maintenanceEvents = pgTable(
  "maintenance_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => maintenanceCases.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    note: text("note"),
    metadata: jsonb("metadata"),
    portalVisible: boolean("portal_visible").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("maintenance_events_case_idx").on(
      table.organizationId,
      table.caseId,
      table.createdAt,
    ),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company"),
    trade: text("trade"),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("contacts_org_name_idx").on(table.organizationId, table.name),
  ],
);

export const utilityPeriods = pgTable(
  "utility_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("draft"),
    ...timestamps,
  },
  (table) => [
    index("utility_periods_org_idx").on(table.organizationId, table.endsAt),
  ],
);

export const utilityCostItems = pgTable(
  "utility_cost_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    periodId: uuid("period_id")
      .notNull()
      .references(() => utilityPeriods.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    amountCents: integer("amount_cents").notNull(),
    allocationKey: text("allocation_key").notNull().default("area"),
    isRecoverable: boolean("is_recoverable").notNull().default(true),
    invoiceDate: timestamp("invoice_date", { withTimezone: true }),
    vendor: text("vendor"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("utility_cost_items_period_idx").on(
      table.organizationId,
      table.periodId,
    ),
  ],
);

export const utilityCostAllocations = pgTable(
  "utility_cost_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    costItemId: uuid("cost_item_id")
      .notNull()
      .references(() => utilityCostItems.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    weightValue: integer("weight_value"),
    amountCents: integer("amount_cents"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("utility_cost_allocations_item_unit_unique").on(
      table.organizationId,
      table.costItemId,
      table.unitId,
    ),
    index("utility_cost_allocations_item_idx").on(
      table.organizationId,
      table.costItemId,
    ),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    originalFilename: text("original_filename"),
    blobKey: text("blob_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedByRenter: boolean("uploaded_by_renter").notNull().default(false),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    unitId: uuid("unit_id").references(() => units.id, {
      onDelete: "set null",
    }),
    tenancyId: uuid("tenancy_id").references(() => tenancies.id, {
      onDelete: "set null",
    }),
    utilityPeriodId: uuid("utility_period_id").references(
      () => utilityPeriods.id,
      { onDelete: "set null" },
    ),
    extractedData: jsonb("extracted_data"),
    processingStatus: text("processing_status").notNull().default("confirmed"),
    version: integer("version").notNull().default(1),
    parentDocumentId: uuid("parent_document_id"),
    issuer: text("issuer"),
    documentDate: timestamp("document_date", { withTimezone: true }),
    servicePeriodStart: timestamp("service_period_start", {
      withTimezone: true,
    }),
    servicePeriodEnd: timestamp("service_period_end", { withTimezone: true }),
    tags: jsonb("tags").notNull().default([]),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    renterId: uuid("renter_id").references(() => renters.id, {
      onDelete: "set null",
    }),
    visibleToRenter: boolean("visible_to_renter").notNull().default(false),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("documents_org_idx").on(table.organizationId),
    index("documents_tenancy_idx").on(table.organizationId, table.tenancyId),
  ],
);

export const rentIndexSources = pgTable(
  "rent_index_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    municipality: text("municipality").notNull(),
    providerType: text("provider_type").notNull(),
    sourceUrl: text("source_url"),
    version: text("version").notNull(),
    geographicScope: jsonb("geographic_scope")
      .notNull()
      .default({ level: "city", districts: [], postalCodes: [] }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    notes: text("notes"),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
    }).notNull(),
    status: sourceStatus("status").notNull().default("pending_review"),
    rules: jsonb("rules").notNull(),
    checksum: text("checksum").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("rent_index_source_version_unique").on(
      table.organizationId,
      table.municipality,
      table.version,
    ),
  ],
);

export const rentIndexImports = pgTable(
  "rent_index_imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
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
  },
  (table) => [
    index("rent_index_imports_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    uniqueIndex("rent_index_imports_blob_unique").on(table.blobPathname),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    type: text("type").notNull().default("info"),
    status: notificationStatus("status").notNull().default("unread"),
    deduplicationKey: text("deduplication_key"),
    metadata: jsonb("metadata"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    uniqueIndex("notifications_org_dedupe_unique").on(
      table.organizationId,
      table.deduplicationKey,
    ),
  ],
);

export const rentAssessments = pgTable(
  "rent_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tenancyId: uuid("tenancy_id")
      .notNull()
      .references(() => tenancies.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => rentIndexSources.id, { onDelete: "restrict" }),
    input: jsonb("input").notNull(),
    result: jsonb("result").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("rent_assessments_org_idx").on(table.organizationId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
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
  },
  (table) => [
    index("tasks_org_due_idx").on(table.organizationId, table.dueAt),
    uniqueIndex("tasks_org_dedupe_unique").on(
      table.organizationId,
      table.deduplicationKey,
    ),
  ],
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tenancyId: uuid("tenancy_id")
      .notNull()
      .references(() => tenancies.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    permissions: jsonb("permissions").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("share_links_token_hash_unique").on(table.tokenHash),
    index("share_links_org_idx").on(table.organizationId),
  ],
);

export const portalItems = pgTable(
  "portal_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tenancyId: uuid("tenancy_id")
      .notNull()
      .references(() => tenancies.id, { onDelete: "restrict" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    kind: portalItemKind("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    severity: text("severity").notNull().default("normal"),
    taskStatus: portalTaskStatus("task_status").notNull().default("open"),
    taskCompletedAt: timestamp("task_completed_at", { withTimezone: true }),
    taskCompletedBy: text("task_completed_by"),
    tenantAcknowledgedAt: timestamp("tenant_acknowledged_at", {
      withTimezone: true,
    }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("portal_items_org_tenancy_archive_created_idx").on(
      table.organizationId,
      table.tenancyId,
      table.archivedAt,
      table.createdAt,
    ),
  ],
);

export const portalItemEntries = pgTable(
  "portal_item_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    portalItemId: uuid("portal_item_id")
      .notNull()
      .references(() => portalItems.id, { onDelete: "cascade" }),
    author: portalEntryAuthor("author").notNull(),
    type: portalEntryType("type").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    shareLinkId: uuid("share_link_id").references(() => shareLinks.id, {
      onDelete: "set null",
    }),
    body: text("body"),
    metadata: jsonb("metadata"),
    requestKey: uuid("request_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("portal_item_entries_org_item_created_idx").on(
      table.organizationId,
      table.portalItemId,
      table.createdAt,
    ),
    uniqueIndex("portal_item_entries_item_request_unique").on(
      table.portalItemId,
      table.requestKey,
    ),
  ],
);

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: jobStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    nextRunAt: timestamp("next_run_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    error: text("error"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("jobs_idempotency_unique").on(table.idempotencyKey),
    index("jobs_dispatch_idx").on(table.status, table.nextRunAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    changes: jsonb("changes"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_org_created_idx").on(table.organizationId, table.createdAt),
  ],
);
