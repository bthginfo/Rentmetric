import { spawnSync } from "node:child_process";

const baseUrl = (
  process.env.LAYOUT_SMOKE_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");
const session = process.env.LAYOUT_SMOKE_SESSION || "rentmetric-layout-smoke";
const stateFile = process.env.LAYOUT_SMOKE_STATE;
const demoUsername = process.env.DEMO_USERNAME || "demo";
const demoPassword = process.env.DEMO_PASSWORD;
const browserCommand = process.platform === "win32" ? "agent-browser.cmd" : "agent-browser";
const common = ["--session", session];
const staticRoutes = [
  "/app/dashboard",
  "/app/properties",
  "/app/units",
  "/app/renters",
  "/app/tenancies",
  "/app/payments",
  "/app/utilities",
  "/app/maintenance",
  "/app/tasks",
  "/app/documents",
  "/app/rent-index",
  "/app/analytics",
  "/app/contacts",
  "/app/settings",
  "/onboarding",
];
const detailPatterns = [
  /^\/app\/properties\/[0-9a-f-]+$/i,
  /^\/app\/units\/[0-9a-f-]+$/i,
  /^\/app\/renters\/[0-9a-f-]+$/i,
  /^\/app\/tenancies\/[0-9a-f-]+$/i,
  /^\/app\/utilities\/[0-9a-f-]+$/i,
];

function browser(args, { allowFailure = false, loadState = false, input } = {}) {
  const result = spawnSync(
    browserCommand,
    [
      ...common,
      ...(loadState && stateFile ? ["--state", stateFile] : []),
      ...args,
    ],
    {
      encoding: "utf8",
      input,
      timeout: 60_000,
      windowsHide: true,
      shell: process.platform === "win32",
    },
  );
  if (result.error?.code === "ENOENT") {
    throw new Error(
      "agent-browser fehlt. Einmalig installieren: npm i -g agent-browser && agent-browser install",
    );
  }
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        result.stdout?.trim() ||
        result.error?.message ||
        `agent-browser ${args[0]} fehlgeschlagen (Status ${result.status})`,
    );
  }
  return result.stdout.trim();
}

const availability = spawnSync(browserCommand, ["--version"], {
  encoding: "utf8",
  windowsHide: true,
  shell: process.platform === "win32",
});
if (availability.error?.code === "ENOENT") {
  console.log("SKIP Layout-Smoke: agent-browser ist nicht installiert.");
  process.exit(0);
}
if (!stateFile && !demoPassword) {
  console.log(
    "SKIP Layout-Smoke: LAYOUT_SMOKE_STATE oder DEMO_PASSWORD ist nicht gesetzt.",
  );
  process.exit(0);
}

function evaluate(source) {
  const encoded = Buffer.from(source).toString("base64");
  const raw = browser(["eval", "-b", encoded]);
  const decoded = JSON.parse(raw);
  return typeof decoded === "string" ? JSON.parse(decoded) : decoded;
}

function inspectGeometry() {
  return evaluate(`JSON.stringify((() => {
    const flow = document.querySelector('.page-flow');
    const paths = [...document.querySelectorAll('a[href]')].map((a) => new URL(a.href).pathname);
    if (!flow) return { skipped: true, reason: 'no .page-flow', currentPath: location.pathname, paths };
    const visible = [...flow.children].filter((node) => {
      const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && style.position !== 'fixed' && rect.height > 0;
    });
    const sectionGap = Number.parseFloat(getComputedStyle(flow).getPropertyValue('--page-section-gap')) || 24;
    const contextGap = Number.parseFloat(getComputedStyle(flow).getPropertyValue('--page-context-gap')) || 12;
    const pairs = visible.slice(1).map((node, index) => {
      const previous = visible[index]; const a = previous.getBoundingClientRect(); const b = node.getBoundingClientRect();
      const previousClass = previous.className || previous.tagName.toLowerCase(); const currentClass = node.className || node.tagName.toLowerCase();
      const attached = previous.classList.contains('unit-detail-header') && node.classList.contains('unit-rent-strip');
      const contextual = previous.classList.contains('dossier-breadcrumb') || previous.classList.contains('success-banner') ||
        (previous.classList.contains('page-header') && node.classList.contains('context-navigation')) ||
        (previous.classList.contains('unit-rent-strip') && node.classList.contains('unit-detail-grid'));
      const expected = attached ? 0 : contextual ? contextGap : sectionGap;
      return { previous: String(previousClass), current: String(currentClass), gap: Math.round((b.top - a.bottom) * 10) / 10, expected };
    });
    return { skipped: false, currentPath: location.pathname, paths, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, failures: pairs.filter((pair) => pair.gap < pair.expected - 1) };
  })())`);
}

const failures = [];
const discovered = new Set();
try {
  if (stateFile) {
    browser(["open", `${baseUrl}/app/dashboard`], { loadState: true });
  } else {
    const authName = `${session}-demo`;
    browser(
      [
        "auth",
        "save",
        authName,
        "--url",
        `${baseUrl}/login`,
        "--username",
        demoUsername,
        "--password-stdin",
      ],
      { input: `${demoPassword}\n` },
    );
    browser(["auth", "login", authName]);
    browser(["wait", "--url", "**/app/dashboard"]);
  }
  const initial = inspectGeometry();
  if (initial.currentPath === "/login") {
    throw new Error(
      "Nicht authentifiziert. LAYOUT_SMOKE_STATE auf einen agent-browser State setzen oder die Session vorab anmelden.",
    );
  }

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 375, height: 768 },
  ]) {
    browser([
      "set",
      "viewport",
      String(viewport.width),
      String(viewport.height),
    ]);
    const queue = [...staticRoutes, ...discovered];
    for (let index = 0; index < queue.length; index += 1) {
      const route = queue[index];
      browser(["open", `${baseUrl}${route}`]);
      const result = inspectGeometry();
      if (result.currentPath === "/login")
        throw new Error(`Session bei ${route} abgelaufen.`);
      for (const detail of result.paths ?? []) {
        if (!detailPatterns.some((pattern) => pattern.test(detail))) continue;
        if (!discovered.has(detail)) {
          discovered.add(detail);
          if (viewport.name === "desktop") queue.push(detail);
        }
      }
      if (result.skipped) {
        console.log(
          `SKIP ${viewport.name.padEnd(7)} ${route} (${result.reason})`,
        );
        continue;
      }
      if (result.overflow > 1 || result.failures.length) {
        failures.push({
          viewport: viewport.name,
          route,
          overflow: result.overflow,
          pairs: result.failures,
        });
        console.error(`FAIL ${viewport.name.padEnd(7)} ${route}`);
      } else {
        console.log(`PASS ${viewport.name.padEnd(7)} ${route}`);
      }
    }
  }
} finally {
  browser(["close"], { allowFailure: true });
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
console.log(
  `Layout-Smoke bestanden; ${staticRoutes.length} stabile Routen plus ${discovered.size} Detailrouten geprüft.`,
);
