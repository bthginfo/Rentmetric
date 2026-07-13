"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

const preferences: Array<{
  value: ThemePreference;
  label: string;
  accessibleLabel: string;
  icon: typeof Monitor;
}> = [
  {
    value: "system",
    label: "System",
    accessibleLabel: "Systemeinstellung verwenden",
    icon: Monitor,
  },
  {
    value: "light",
    label: "Hell",
    accessibleLabel: "Helles Farbschema",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dunkel",
    accessibleLabel: "Dunkles Farbschema",
    icon: Moon,
  },
];

function applyTheme(preference: ThemePreference) {
  const isDark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function ThemeControl() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem("rentmetric-theme");
    const initial = preferences.some((item) => item.value === saved)
      ? (saved as ThemePreference)
      : "system";
    queueMicrotask(() => setPreference(initial));
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if (
        (window.localStorage.getItem("rentmetric-theme") || "system") ===
        "system"
      ) {
        applyTheme("system");
      }
    };
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  function selectTheme(next: ThemePreference) {
    setPreference(next);
    window.localStorage.setItem("rentmetric-theme", next);
    applyTheme(next);
  }

  return (
    <fieldset className="theme-control" aria-label="Darstellung">
      <legend className="sr-only">Darstellung wählen</legend>
      {preferences.map(({ value, label, accessibleLabel, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className={preference === value ? "active" : ""}
          aria-pressed={preference === value}
          aria-label={accessibleLabel}
          title={accessibleLabel}
          onClick={() => selectTheme(value)}
        >
          <Icon size={14} strokeWidth={2} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </fieldset>
  );
}
