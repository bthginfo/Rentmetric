import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { hash } from "argon2";

const databaseUrl = process.env.DATABASE_URL;
const username = (process.env.DEMO_USERNAME || "demo").toLowerCase();
const password = process.env.DEMO_PASSWORD;
const organizationName = process.env.DEMO_ORGANIZATION || "Rentmetric Demo";

if (!databaseUrl) throw new Error("DATABASE_URL fehlt");
if (!password || password.length < 14) throw new Error("DEMO_PASSWORD mit mindestens 14 Zeichen ist erforderlich");

const sql = neon(databaseUrl);
const existing = await sql`select u.id as user_id, m.organization_id from users u join organization_memberships m on m.user_id = u.id where u.username = ${username} limit 1`;
let userId = existing[0]?.user_id;
let organizationId = existing[0]?.organization_id;

if (!userId || !organizationId) {
  userId = randomUUID();
  organizationId = randomUUID();
  const membershipId = randomUUID();
  const passwordHash = await hash(password, { type: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  await sql.transaction((tx) => [
    tx`insert into users (id, username, password_hash, display_name) values (${userId}, ${username}, ${passwordHash}, 'Demo Vermieter')`,
    tx`insert into organizations (id, name) values (${organizationId}, ${organizationName})`,
    tx`insert into organization_memberships (id, organization_id, user_id, role) values (${membershipId}, ${organizationId}, ${userId}, 'owner')`,
  ]);
}

const propertyCount = await sql`select count(*)::int as count from properties where organization_id = ${organizationId}`;
if (propertyCount[0].count === 0) {
  const kastanienhofId = randomUUID();
  const rheinblickId = randomUUID();
  const units = [
    [kastanienhofId, "EG links", "Erdgeschoss", 82, 35],
    [kastanienhofId, "EG rechts", "Erdgeschoss", 74, 30],
    [kastanienhofId, "1. OG links", "1. Obergeschoss", 88, 40],
    [kastanienhofId, "1. OG rechts", "1. Obergeschoss", 76, 30],
    [kastanienhofId, "Dachgeschoss", "Dachgeschoss", 80, 30],
    [rheinblickId, "Erdgeschoss", "Erdgeschoss", 85, 35],
    [rheinblickId, "1. Obergeschoss", "1. Obergeschoss", 91, 40],
    [rheinblickId, "Dachgeschoss", "Dachgeschoss", 78, 30],
  ];
  await sql.transaction([
    sql`insert into properties (id, organization_id, name, street, house_number, postal_code, city, state, year_built) values (${kastanienhofId}, ${organizationId}, 'Kastanienhof', 'Berrenrather Straße', '214', '50937', 'Köln', 'Nordrhein-Westfalen', 1968)`,
    sql`insert into properties (id, organization_id, name, street, house_number, postal_code, city, state, year_built) values (${rheinblickId}, ${organizationId}, 'Rheinblick', 'Meckenheimer Allee', '118', '53115', 'Bonn', 'Nordrhein-Westfalen', 1984)`,
    ...units.map(([propertyId, label, floor, areaSqm, roomsTimesTen]) => sql`insert into units (id, organization_id, property_id, label, floor, area_sqm, rooms_times_ten) values (${randomUUID()}, ${organizationId}, ${propertyId}, ${label}, ${floor}, ${areaSqm}, ${roomsTimesTen})`),
    sql`insert into renters (id, organization_id, first_name, last_name, email) values (${randomUUID()}, ${organizationId}, 'Mara', 'Beispiel', 'mara.beispiel@example.invalid')`,
    sql`insert into renters (id, organization_id, first_name, last_name, email) values (${randomUUID()}, ${organizationId}, 'Jonas', 'Muster', 'jonas.muster@example.invalid')`,
    sql`insert into renters (id, organization_id, first_name, last_name) values (${randomUUID()}, ${organizationId}, 'Lea', 'Demofrau')`,
  ]);
  console.log("Fiktives Demo-Portfolio wurde angelegt.");
} else {
  console.log("Demo-Portfolio existiert bereits; keine Änderung vorgenommen.");
}

const demoUnits = await sql`select id, label from units where organization_id = ${organizationId} order by created_at, label limit 8`;
const demoRenters = await sql`select id from renters where organization_id = ${organizationId} order by created_at limit 3`;
await sql`update units set
  target_cold_rent_cents = coalesce(target_cold_rent_cents, area_sqm * 1350),
  utility_estimate_cents = coalesce(utility_estimate_cents, area_sqm * 320),
  condition = coalesce(condition, 'Gepflegt'),
  heating_type = coalesce(heating_type, 'Zentralheizung'),
  energy_source = coalesce(energy_source, 'Gas'),
  bathroom = coalesce(bathroom, 'Tageslichtbad mit Dusche oder Wanne'),
  flooring = coalesce(flooring, 'Parkett und Fliesen'),
  has_balcony = case when label ilike '%dach%' then has_balcony else true end,
  updated_at = now()
where organization_id = ${organizationId}`;

const tenancyCount = await sql`select count(*)::int as count from tenancies where organization_id = ${organizationId}`;
if (tenancyCount[0].count === 0 && demoUnits.length >= 3 && demoRenters.length >= 3) {
  await sql.transaction([
    sql`insert into tenancies (id, organization_id, unit_id, renter_id, starts_at, cold_rent_cents, utility_advance_cents, deposit_cents, last_rent_increase_at) values (${randomUUID()}, ${organizationId}, ${demoUnits[0].id}, ${demoRenters[0].id}, '2021-03-01', 104000, 26000, 312000, '2023-05-01')`,
    sql`insert into tenancies (id, organization_id, unit_id, renter_id, starts_at, cold_rent_cents, utility_advance_cents, deposit_cents, last_rent_increase_at) values (${randomUUID()}, ${organizationId}, ${demoUnits[1].id}, ${demoRenters[1].id}, '2023-08-15', 96000, 23000, 288000, '2025-01-01')`,
    sql`insert into tenancies (id, organization_id, unit_id, renter_id, starts_at, cold_rent_cents, utility_advance_cents, deposit_cents) values (${randomUUID()}, ${organizationId}, ${demoUnits[2].id}, ${demoRenters[2].id}, '2019-11-01', 112000, 28000, 336000)`,
    sql`update units set status = 'occupied' where id in (${demoUnits[0].id}, ${demoUnits[1].id}, ${demoUnits[2].id})`,
  ]);
  console.log("Fiktive Demo-Mietverhältnisse wurden ergänzt.");
}

const taskCount = await sql`select count(*)::int as count from tasks where organization_id = ${organizationId}`;
if (taskCount[0].count === 0) {
  const tomorrow = new Date(Date.now() + 86_400_000);
  const nextWeek = new Date(Date.now() + 7 * 86_400_000);
  await sql.transaction([
    sql`insert into tasks (id, organization_id, title, description, rule_id, deduplication_key, due_at, severity, source_type) values (${randomUUID()}, ${organizationId}, 'Mieteingang prüfen', 'Ein Zahlungseingang konnte noch nicht eindeutig zugeordnet werden.', 'payment-review', 'demo-payment-review', ${tomorrow}, 'critical', 'rule')`,
    sql`insert into tasks (id, organization_id, title, description, rule_id, deduplication_key, due_at, severity, source_type) values (${randomUUID()}, ${organizationId}, 'Mietanpassung fachlich prüfen', 'Stammdaten und lokalen Mietspiegel gegenprüfen; keine automatische Freigabe.', 'rent-review', 'demo-rent-review', ${nextWeek}, 'warning', 'rule')`,
  ]);
  console.log("Fiktive Demo-Fristen wurden ergänzt.");
}

console.log(`Demo-Arbeitsbereich für '${username}' ist bereit.`);
