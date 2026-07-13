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
const existing = await sql`select id from users where username = ${username} limit 1`;

if (existing.length) {
  console.log(`Demo-Benutzer '${username}' existiert bereits; keine Änderung vorgenommen.`);
  process.exit(0);
}

const userId = randomUUID();
const organizationId = randomUUID();
const membershipId = randomUUID();
const passwordHash = await hash(password, { type: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 });

await sql.transaction((tx) => [
  tx`insert into users (id, username, password_hash, display_name) values (${userId}, ${username}, ${passwordHash}, 'Demo Vermieter')`,
  tx`insert into organizations (id, name) values (${organizationId}, ${organizationName})`,
  tx`insert into organization_memberships (id, organization_id, user_id, role) values (${membershipId}, ${organizationId}, ${userId}, 'owner')`,
]);

console.log(`Demo-Arbeitsbereich für '${username}' wurde angelegt.`);
