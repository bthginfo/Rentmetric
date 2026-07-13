import { createHash } from "node:crypto";

const monthDate = (offset, day = 1) => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, day, 12),
  );
};

export async function enrichDemoWorkspace({
  sql,
  organizationId,
  userId,
  stableUuid,
}) {
  const id = (key) => stableUuid(organizationId, `rentmetric-demo:${key}`);
  await sql`update organizations
    set bic = coalesce(bic, 'COLSDE33XXX'),
        transfer_note = coalesce(transfer_note, 'Bitte den individuellen Verwendungszweck unverändert übernehmen.'),
        updated_at = now()
    where id = ${organizationId}`;
  const properties =
    await sql`select id from properties where organization_id = ${organizationId}
    and ((name = 'Kastanienhof' and street = 'Berrenrather Straße') or (name = 'Rheinblick' and street = 'Meckenheimer Allee'))
    order by name`;
  const units = await sql`select u.id, u.property_id from units u
    inner join properties p on p.id = u.property_id and p.organization_id = ${organizationId}
    where u.organization_id = ${organizationId}
      and ((p.name = 'Kastanienhof' and p.street = 'Berrenrather Straße') or (p.name = 'Rheinblick' and p.street = 'Meckenheimer Allee'))
    order by p.name, u.label limit 8`;
  const tenancies =
    await sql`select t.id, t.unit_id, t.renter_id, t.cold_rent_cents from tenancies t
    inner join units u on u.id = t.unit_id and u.organization_id = ${organizationId}
    inner join properties p on p.id = u.property_id and p.organization_id = ${organizationId}
    where t.organization_id = ${organizationId}
      and ((p.name = 'Kastanienhof' and p.street = 'Berrenrather Straße') or (p.name = 'Rheinblick' and p.street = 'Meckenheimer Allee'))
      and (t.ends_at is null or t.ends_at >= now())
    order by t.created_at limit 3`;

  const occupiedUnitIds = new Set(tenancies.map((tenancy) => tenancy.unit_id));
  const historicalUnit = units.find((unit) => !occupiedUnitIds.has(unit.id));
  if (historicalUnit) {
    const renterId = id("renter:former");
    await sql.transaction([
      sql`insert into renters (id, organization_id, first_name, last_name, email, phone)
          values (${renterId}, ${organizationId}, 'Nora', 'Fiktiv', 'nora.fiktiv@example.invalid', '+49 221 000000')
          on conflict (id) do update set email = excluded.email, phone = excluded.phone, updated_at = now()`,
      sql`insert into tenancies (id, organization_id, unit_id, renter_id, starts_at, ends_at, cold_rent_cents, utility_advance_cents, deposit_cents, deposit_paid_cents, deposit_paid_at, deposit_returned_at, rent_due_day, payment_reference)
          values (${id("tenancy:former")}, ${organizationId}, ${historicalUnit.id}, ${renterId}, ${monthDate(-30)}, ${monthDate(-7, 28)}, 89000, 22000, 267000, 267000, ${monthDate(-30, 5)}, ${monthDate(-6, 12)}, 3, 'DEMO-NORA-FIKTIV')
          on conflict (id) do update set ends_at = excluded.ends_at, deposit_returned_at = coalesce(tenancies.deposit_returned_at, excluded.deposit_returned_at), updated_at = now()`,
    ]);
  }

  if (tenancies.length) {
    const portalTenancy = tenancies[0];
    const portalUnit = units.find((unit) => unit.id === portalTenancy.unit_id);
    if (portalUnit) {
      const shareLinkId = id("share-link:portal-report");
      const reportId = id("maintenance:portal-report");
      const tokenHash = createHash("sha256")
        .update(`${organizationId}-rentmetric-demo-portal`)
        .digest("hex");
      await sql.transaction([
        sql`insert into share_links (id, organization_id, tenancy_id, token_hash, permissions, expires_at)
          values (${shareLinkId}, ${organizationId}, ${portalTenancy.id}, ${tokenHash}, ${JSON.stringify({ masterData: true, documents: true, deadlines: true, uploads: true, reports: true, paymentDetails: true })}::jsonb, ${monthDate(12, 28)})
          on conflict (id) do update set tenancy_id = excluded.tenancy_id, token_hash = excluded.token_hash, permissions = excluded.permissions, expires_at = excluded.expires_at, revoked_at = null, updated_at = now()`,
        sql`insert into maintenance_cases (id, organization_id, property_id, unit_id, title, description, priority, category, status, reported_by_renter, portal_visible, portal_tenancy_id, portal_renter_id, portal_share_link_id, portal_report_key)
          values (${reportId}, ${organizationId}, ${portalUnit.property_id}, ${portalTenancy.unit_id}, 'Rückfrage zur Nebenkostenübersicht', 'Fiktive Demo-Anfrage aus dem sicheren Mieterportal.', 'normal', 'general', 'open', true, true, ${portalTenancy.id}, ${portalTenancy.renter_id}, ${shareLinkId}, ${id("portal-report:key")})
          on conflict (id) do update set portal_visible = true, portal_tenancy_id = excluded.portal_tenancy_id, portal_renter_id = excluded.portal_renter_id, portal_share_link_id = excluded.portal_share_link_id, updated_at = now()`,
        sql`insert into maintenance_events (id, organization_id, case_id, type, note, portal_visible)
          values (${id("maintenance-event:portal-report")}, ${organizationId}, ${reportId}, 'renter.reported', 'Meldung sicher übermittelt.', true)
          on conflict (id) do update set note = excluded.note, portal_visible = true`,
      ]);
    }
    const payments = [];
    for (const [tenancyIndex, tenancy] of tenancies.entries()) {
      for (let offset = -11; offset <= 0; offset += 1) {
        const dueAt = monthDate(offset, 3);
        const period = dueAt.toISOString().slice(0, 7);
        const open = offset === 0 && tenancyIndex === 1;
        const late = offset === -2 && tenancyIndex === 2;
        const paidAt = open
          ? null
          : monthDate(offset, late ? 16 : 4 + (tenancyIndex % 2));
        payments.push(sql`insert into payments (id, organization_id, tenancy_id, amount_cents, due_at, paid_at, reference)
          values (${id(`payment:${tenancy.id}:${period}`)}, ${organizationId}, ${tenancy.id}, ${tenancy.cold_rent_cents}, ${dueAt}, ${paidAt}, ${`Miete ${period}`})
          on conflict (id) do update set amount_cents = excluded.amount_cents, paid_at = excluded.paid_at, reference = excluded.reference, updated_at = now()`);
      }
    }
    await sql.transaction(payments);
    await sql.transaction(
      tenancies.slice(0, 2).map((tenancy, index) => {
        const previous = tenancy.cold_rent_cents - (index + 1) * 3500;
        return sql`insert into rent_changes (id, organization_id, tenancy_id, effective_from, old_cold_rent_cents, new_cold_rent_cents, change_type, reason, status)
        values (${id(`rent-change:${tenancy.id}`)}, ${organizationId}, ${tenancy.id}, ${monthDate(-8 - index * 3)}, ${previous}, ${tenancy.cold_rent_cents}, 'agreement', 'Fiktive Demo-Anpassung nach gemeinsamer Vereinbarung', 'active')
        on conflict (id) do update set old_cold_rent_cents = excluded.old_cold_rent_cents, new_cold_rent_cents = excluded.new_cold_rent_cents, updated_at = now()`;
      }),
    );
  }

  if (properties.length) {
    const year = new Date().getUTCFullYear() - 1;
    const periodId = id(`utility-period:${properties[0].id}:${year}`);
    await sql`insert into utility_periods (id, organization_id, property_id, title, starts_at, ends_at, status)
      values (${periodId}, ${organizationId}, ${properties[0].id}, ${`Betriebskosten ${year}`}, ${new Date(Date.UTC(year, 0, 1, 12))}, ${new Date(Date.UTC(year, 11, 31, 12))}, 'review')
      on conflict (id) do update set status = excluded.status, updated_at = now()`;
    const costs = [
      ["Heizung und Warmwasser", 684000, "area", "Demo Energieversorgung"],
      ["Wasser und Abwasser", 218000, "consumption", "Demo Stadtwerke"],
      ["Gebäudereinigung", 156000, "units", "Sauber & Fiktiv GmbH"],
      ["Grundsteuer", 192000, "area", "Demo Kommune"],
      ["Versicherung", 126000, "area", "Beispiel Versicherung"],
    ];
    await sql.transaction(
      costs.map(
        (
          [label, amount, allocation, vendor],
          index,
        ) => sql`insert into utility_cost_items (id, organization_id, period_id, label, amount_cents, allocation_key, is_recoverable, invoice_date, vendor)
      values (${id(`utility-cost:${periodId}:${index}`)}, ${organizationId}, ${periodId}, ${label}, ${amount}, ${allocation}, true, ${new Date(Date.UTC(year, 10, 15 + index, 12))}, ${vendor})
      on conflict (id) do update set amount_cents = excluded.amount_cents, allocation_key = excluded.allocation_key, vendor = excluded.vendor, updated_at = now()`,
      ),
    );

    const contacts = [
      [
        "Kai Beispiel",
        "Fiktiv Haustechnik GmbH",
        "Heizung & Sanitär",
        "kai.beispiel@example.invalid",
      ],
      [
        "Mina Muster",
        "Rhein Elektro Demo",
        "Elektro",
        "mina.muster@example.invalid",
      ],
      [
        "Tarek Test",
        "Hausservice Testbetrieb",
        "Hausmeister",
        "tarek.test@example.invalid",
      ],
    ];
    await sql.transaction(
      contacts.map(
        (
          [name, company, trade, email],
          index,
        ) => sql`insert into contacts (id, organization_id, name, company, trade, email)
      values (${id(`contact:${index}`)}, ${organizationId}, ${name}, ${company}, ${trade}, ${email})
      on conflict (id) do update set company = excluded.company, trade = excluded.trade, email = excluded.email, updated_at = now()`,
      ),
    );

    const cases = [
      [
        "Heizkörperventil prüfen",
        "repair",
        "resolved",
        "normal",
        -5,
        18500,
        17200,
      ],
      [
        "Dachrinne reinigen",
        "maintenance",
        "scheduled",
        "important",
        -3,
        32000,
        null,
      ],
      ["Feuchtigkeit im Keller", "damage", "open", "urgent", -2, 85000, null],
      [
        "Rauchwarnmelder warten",
        "inspection",
        "resolved",
        "normal",
        -8,
        24000,
        23800,
      ],
      [
        "Treppenhausbeleuchtung",
        "repair",
        "resolved",
        "important",
        -1,
        12000,
        10900,
      ],
      [
        "Fenstergriff schwergängig",
        "complaint",
        "open",
        "normal",
        0,
        9500,
        null,
      ],
    ];
    const queries = [];
    for (const [
      index,
      [title, category, status, priority, offset, estimated, actual],
    ] of cases.entries()) {
      const caseId = id(`maintenance:${index}`);
      const createdAt = monthDate(offset, 8 + index);
      const resolvedAt =
        status === "resolved" ? monthDate(offset, 18 + index) : null;
      queries.push(sql`insert into maintenance_cases (id, organization_id, property_id, unit_id, title, description, priority, category, estimated_cost_cents, actual_cost_cents, status, due_at, scheduled_at, resolved_at, created_at)
        values (${caseId}, ${organizationId}, ${properties[index % properties.length].id}, ${units[index % units.length]?.id || null}, ${title}, 'Fiktiver Demo-Vorgang für Auswertung und Workflow.', ${priority}, ${category}, ${estimated}, ${actual}, ${status}, ${monthDate(offset + 1, 20)}, ${status === "scheduled" ? monthDate(1, 12) : null}, ${resolvedAt}, ${createdAt})
        on conflict (id) do update set status = excluded.status, estimated_cost_cents = excluded.estimated_cost_cents, actual_cost_cents = excluded.actual_cost_cents, resolved_at = excluded.resolved_at, updated_at = now()`);
      queries.push(sql`insert into maintenance_events (id, organization_id, case_id, user_id, type, note, created_at)
        values (${id(`maintenance-event:${index}`)}, ${organizationId}, ${caseId}, ${userId}, ${status === "resolved" ? "resolved" : "created"}, ${status === "resolved" ? "Demo-Vorgang fachlich abgeschlossen." : "Demo-Vorgang wurde aufgenommen."}, ${resolvedAt || createdAt})
        on conflict (id) do update set type = excluded.type, note = excluded.note`);
    }
    await sql.transaction(queries);
  }

  const tasks = [
    [
      "demo-payment-review",
      "Mieteingang prüfen",
      "Ein offener Demo-Zahlungseingang benötigt eine Zuordnung.",
      "urgent",
      monthDate(0, 10),
    ],
    [
      "demo-utility-review",
      "Betriebskosten prüfen",
      "Die Demo-Abrechnung ist bereit für die fachliche Prüfung.",
      "warning",
      monthDate(1, 5),
    ],
  ];
  await sql.transaction(
    tasks.map(
      ([
        dedupe,
        title,
        description,
        severity,
        dueAt,
      ]) => sql`insert into tasks (id, organization_id, title, description, rule_id, deduplication_key, due_at, severity, source_type)
    values (${id(`task:${dedupe}`)}, ${organizationId}, ${title}, ${description}, ${dedupe}, ${dedupe}, ${dueAt}, ${severity}, 'rule')
    on conflict (organization_id, deduplication_key) do update set title = excluded.title, description = excluded.description, due_at = excluded.due_at, severity = excluded.severity, status = 'open', updated_at = now()`,
    ),
  );

  const blobKey = process.env.DEMO_DOCUMENT_BLOB_KEY;
  if (blobKey && tenancies[0]) {
    await sql`insert into documents (id, organization_id, tenancy_id, title, category, original_filename, blob_key, mime_type, size_bytes, processing_status, approved_at)
      values (${id("document:sample-contract")}, ${organizationId}, ${tenancies[0].id}, 'Mietvertrag (Demo)', 'Vertrag', 'demo-mietvertrag.pdf', ${blobKey}, 'application/pdf', 128000, 'confirmed', now())
      on conflict (id) do update set tenancy_id = excluded.tenancy_id, blob_key = excluded.blob_key, updated_at = now()`;
  } else {
    console.log(
      "Demo-Dokument ausgelassen; DEMO_DOCUMENT_BLOB_KEY ist nicht gesetzt.",
    );
  }
  console.log(
    "Deterministische Demo-Zahlungen, Kosten, Wartungen und Historien wurden synchronisiert.",
  );
}
