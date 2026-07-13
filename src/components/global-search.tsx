"use client";

import Link from "next/link";
import { Building2, CheckSquare2, DoorOpen, FileText, Gauge, Search, UserRound, Wrench, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  id: string;
  type: "property" | "unit" | "renter" | "document" | "case" | "task" | "source";
  title: string;
  subtitle: string;
  href: string;
};
const icons = { property: Building2, unit: DoorOpen, renter: UserRound, document: FileText, case: Wrench, task: CheckSquare2, source: Gauge };
const labels = {
  property: "Objekte",
  unit: "Einheiten",
  renter: "Mieter:innen",
  document: "Dokumente",
  case: "Wartungen & Fälle",
  task: "Aufgaben",
  source: "Mietspiegel",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as { results?: Result[] };
        setResults(data.results || []);
        setActive(0);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function changeQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  function keyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    }
    if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      router.push(results[active].href);
    }
  }

  const grouped = (["property", "unit", "renter", "case", "task", "document", "source"] as const)
    .map((type) => ({
      type,
      items: results.filter((item) => item.type === type),
    }))
    .filter((group) => group.items.length);
  return (
    <>
      <button
        className="search-trigger"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Globale Suche öffnen"
      >
        <Search size={16} />
        <span>
          <strong>Globale Suche</strong>
          <small>Objekte, Einheiten, Mieter:innen</small>
        </span>
        <kbd>⌘ K</kbd>
      </button>
      {open && (
        <div
          className="search-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Globale Suche"
          >
            <div className="search-input-row">
              <Search size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                onKeyDown={keyDown}
                placeholder="Nach Name, Adresse oder Einheit suchen …"
                aria-label="Suchbegriff"
              />
              <button
                onClick={() => setOpen(false)}
                aria-label="Suche schließen"
              >
                <X size={18} />
              </button>
            </div>
            <div className="search-results" aria-live="polite">
              {!query && (
                <div className="search-hint">
                  <Search size={26} />
                  <strong>Ihr gesamtes Portfolio durchsuchen</strong>
                  <span>Tippen Sie mindestens zwei Zeichen.</span>
                </div>
              )}
              {query && loading && (
                <div className="search-hint">
                  <span className="search-loader" />
                  Suche läuft …
                </div>
              )}
              {query.length >= 2 && !loading && !results.length && (
                <div className="search-hint">
                  <strong>Keine Treffer</strong>
                  <span>
                    Versuchen Sie einen Namen, eine Straße oder
                    Einheitenbezeichnung.
                  </span>
                </div>
              )}
              {grouped.map((group) => (
                <div className="search-group" key={group.type}>
                  <span>{labels[group.type]}</span>
                  {group.items.map((item) => {
                    const Icon = icons[item.type];
                    const index = results.indexOf(item);
                    return (
                      <Link
                        key={`${item.type}-${item.id}`}
                        href={item.href}
                        className={active === index ? "active" : ""}
                        onClick={() => setOpen(false)}
                        onMouseEnter={() => setActive(index)}
                      >
                        <i>
                          <Icon size={16} />
                        </i>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.subtitle}</small>
                        </span>
                        <b>→</b>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <footer className="search-footer">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> navigieren
              </span>
              <span>
                <kbd>↵</kbd> öffnen
              </span>
              <span>
                <kbd>esc</kbd> schließen
              </span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
