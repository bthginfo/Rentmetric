import { hash } from "argon2";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || null;
const email = process.env.ADMIN_EMAIL?.trim() || null;

if (!databaseUrl) throw new Error("DATABASE_URL fehlt.");
if (!username || !/^[a-z0-9._-]{3,64}$/.test(username))
  throw new Error("ADMIN_USERNAME fehlt oder ist ungültig.");
if (!password || password.length < 12 || !/[A-Za-zÄÖÜäöüß]/.test(password))
  throw new Error("ADMIN_PASSWORD erfüllt die Passwortanforderungen nicht.");

const passwordHash = await hash(password, {
  type: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
});
const sql = neon(databaseUrl);
const [admin] = await sql`
  insert into platform_admins (username, password_hash, display_name, email, password_changed_at, created_at, updated_at)
  values (${username}, ${passwordHash}, ${displayName}, ${email}, now(), now(), now())
  on conflict (username) do update set
    password_hash = excluded.password_hash,
    display_name = coalesce(excluded.display_name, platform_admins.display_name),
    email = coalesce(excluded.email, platform_admins.email),
    disabled_at = null,
    password_changed_at = now(),
    updated_at = now()
  returning id
`;
await sql`delete from platform_admin_sessions where admin_id = ${admin.id}`;
console.log(`Platform-Admin "${username}" wurde eingerichtet; bestehende Admin-Sitzungen wurden beendet.`);
