"use client";

import { ArrowLeft, ArrowRight, Check, CircleHelp, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { finishProductTour } from "@/app/app/help/actions";

const steps = [
  {
    title: "Ihr Arbeitsbereich auf einen Blick",
    body: "Die Navigation bringt Sie zu allen Bereichen. Im Dashboard sehen Sie Kennzahlen, Fristen und Handlungsbedarf gebündelt.",
    targets: ["main-navigation", "mobile-navigation"],
  },
  {
    title: "Alles sofort finden",
    body: "Die globale Suche findet Objekte, Einheiten, Mieter:innen, Dokumente, Aufgaben und Fälle – auch per ⌘ K oder Strg K.",
    targets: ["global-search"],
  },
  {
    title: "Portfolio sauber aufbauen",
    body: "Unter Immobilien verwalten Sie Objekte und Einheiten. Mietverhältnisse verbinden anschließend Wohnung, Mieter:in und Vertragsdaten.",
    targets: ["portfolio-navigation", "mobile-properties"],
  },
  {
    title: "Nichts Wichtiges verpassen",
    body: "Aufgaben, Fristen und Benachrichtigungen bündeln offene Schritte und smarte, regelbasierte Erinnerungen.",
    targets: ["tasks-navigation", "mobile-tasks"],
  },
  {
    title: "Weitere Werkzeuge",
    body: "Dokumente, Zahlungen, Betriebskosten, Mietspiegel und Wartungsfälle finden Sie in den weiteren Bereichen.",
    targets: ["more-navigation", "mobile-more"],
  },
  {
    title: "Hilfe ist jederzeit da",
    body: "Die Hilfe erklärt typische Abläufe mit direkten Links. Dort können Sie diese kurze Tour jederzeit erneut starten.",
    targets: ["help-navigation", "mobile-more"],
  },
] as const;

type Rect = { top: number; left: number; width: number; height: number };
type Position = { top: number; left: number };

export function ProductTour({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardPosition, setCardPosition] = useState<Position | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const placeCard = useCallback(() => {
    if (!rect || window.innerWidth <= 800 || !dialogRef.current) {
      setCardPosition(null);
      return;
    }
    const viewportPadding = 16;
    const gap = 16;
    const card = dialogRef.current.getBoundingClientRect();
    const maxLeft = Math.max(viewportPadding, window.innerWidth - card.width - viewportPadding);
    const maxTop = Math.max(viewportPadding, window.innerHeight - card.height - viewportPadding);
    const clampLeft = (value: number) => Math.min(maxLeft, Math.max(viewportPadding, value));
    const clampTop = (value: number) => Math.min(maxTop, Math.max(viewportPadding, value));
    const sidebarLike = rect.left < 280 || rect.height > window.innerHeight * 0.45;
    const spaceBelow = window.innerHeight - (rect.top + rect.height + gap);
    const spaceAbove = rect.top - gap;

    if (sidebarLike) {
      setCardPosition({
        left: clampLeft(rect.left + rect.width + gap),
        top: clampTop(rect.top),
      });
      return;
    }
    if (spaceBelow >= card.height || spaceBelow >= spaceAbove) {
      setCardPosition({
        left: clampLeft(rect.left + rect.width / 2 - card.width / 2),
        top: clampTop(rect.top + rect.height + gap),
      });
      return;
    }
    setCardPosition({
      left: clampLeft(rect.left + rect.width / 2 - card.width / 2),
      top: clampTop(rect.top - card.height - gap),
    });
  }, [rect]);

  const findTarget = useCallback(() => {
    const target = steps[step].targets
      .flatMap((name) =>
        Array.from(
          document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`),
        ),
      )
      .find((element) => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return (
          box.width > 0 &&
          box.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      });
    if (!target) {
      setRect(null);
      return;
    }
    if (window.innerWidth <= 800) {
      target.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
    const box = target.getBoundingClientRect();
    const padding = window.innerWidth <= 800 ? 5 : 8;
    setRect({
      top: Math.max(6, box.top - padding),
      left: Math.max(6, box.left - padding),
      width: Math.min(window.innerWidth - 12, box.width + padding * 2),
      height: box.height + padding * 2,
    });
  }, [step]);

  useEffect(() => {
    const start = () => {
      setStep(0);
      setError("");
      setConfirmClose(false);
      setOpen(true);
    };
    window.addEventListener("rentmetric:start-tour", start);
    return () => window.removeEventListener("rentmetric:start-tour", start);
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add("tour-open");
    const inertTargets = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".app-shell > .sidebar, .app-shell > .app-main > .topbar, .app-shell > .app-main > .content, .app-shell > .app-main > .mobile-nav",
      ),
    ).map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    inertTargets.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.documentElement.classList.remove("tour-open");
      document.body.style.overflow = previousOverflow;
      inertTargets.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      previousFocus.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const initialFrame = requestAnimationFrame(findTarget);
    const update = () => requestAnimationFrame(findTarget);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(initialFrame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [findTarget, open]);

  useEffect(() => {
    if (!open) return;
    const initialFrame = requestAnimationFrame(placeCard);
    const observer = new ResizeObserver(() => requestAnimationFrame(placeCard));
    if (dialogRef.current) observer.observe(dialogRef.current);
    window.addEventListener("resize", placeCard);
    return () => {
      cancelAnimationFrame(initialFrame);
      observer.disconnect();
      window.removeEventListener("resize", placeCard);
    };
  }, [open, placeCard]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmClose(true);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href]",
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function closeWith(result: "completed" | "skipped") {
    setPending(true);
    setError("");
    try {
      const response = await finishProductTour(result);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setOpen(false);
    } catch {
      setError(
        "Der Fortschritt konnte nicht gespeichert werden. Bitte erneut versuchen.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;
  const current = steps[step];

  return (
    <div className="product-tour-layer" aria-live="polite">
      <div className="product-tour-blocker" aria-hidden="true" />
      {rect ? (
        <>
          <div
            className="product-tour-dimmer"
            style={{ inset: `0 0 auto 0`, height: Math.max(0, rect.top) }}
            aria-hidden="true"
          />
          <div
            className="product-tour-dimmer"
            style={{
              top: rect.top,
              left: 0,
              width: Math.max(0, rect.left),
              height: rect.height,
            }}
            aria-hidden="true"
          />
          <div
            className="product-tour-dimmer"
            style={{
              top: rect.top,
              left: rect.left + rect.width,
              right: 0,
              height: rect.height,
            }}
            aria-hidden="true"
          />
          <div
            className="product-tour-dimmer"
            style={{
              top: rect.top + rect.height,
              right: 0,
              bottom: 0,
              left: 0,
            }}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="product-tour-dimmer is-full" aria-hidden="true" />
      )}
      {rect && (
        <div
          className="product-tour-spotlight"
          style={rect}
          aria-hidden="true"
        />
      )}
      <section
        ref={dialogRef}
        className={`product-tour-card ${rect && cardPosition ? "is-targeted" : "is-centered"}`}
        style={cardPosition ?? undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className="product-tour-handle" aria-hidden="true" />
        <header>
          <span className="product-tour-step">
            Schritt {step + 1} von {steps.length}
          </span>
          <button
            type="button"
            className="product-tour-close"
            onClick={() => setConfirmClose(true)}
            aria-label="Produkttour schließen"
          >
            <X size={18} />
          </button>
        </header>
        <div className="product-tour-icon" aria-hidden="true">
          {step === steps.length - 1 ? (
            <CircleHelp size={21} />
          ) : (
            <span>{step + 1}</span>
          )}
        </div>
        <h2 id={titleId}>{current.title}</h2>
        <p id={descriptionId}>{current.body}</p>
        <div
          className="product-tour-progress"
          aria-label={`${step + 1} von ${steps.length} Schritten`}
        >
          {steps.map((item, index) => (
            <i key={item.title} className={index <= step ? "active" : ""} />
          ))}
        </div>
        {confirmClose && (
          <div className="product-tour-confirm" role="alert">
            <strong>Tour wirklich überspringen?</strong>
            <span>Sie können sie später in der Hilfe erneut starten.</span>
            <div>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setConfirmClose(false)}
              >
                Weiter ansehen
              </button>
              <button
                className="text-button"
                type="button"
                disabled={pending}
                onClick={() => closeWith("skipped")}
              >
                Überspringen
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="product-tour-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button
            className="text-button product-tour-skip"
            type="button"
            onClick={() => setConfirmClose(true)}
          >
            Überspringen
          </button>
          <div>
            <button
              className="btn secondary"
              type="button"
              disabled={step === 0 || pending}
              onClick={() => {
                setConfirmClose(false);
                setStep((value) => value - 1);
              }}
            >
              <ArrowLeft size={16} /> Zurück
            </button>
            {step === steps.length - 1 ? (
              <button
                className="btn"
                type="button"
                disabled={pending}
                onClick={() => closeWith("completed")}
              >
                <Check size={16} /> {pending ? "Speichern …" : "Fertig"}
              </button>
            ) : (
              <button
                className="btn"
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirmClose(false);
                  setStep((value) => value + 1);
                }}
              >
                Weiter <ArrowRight size={16} />
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
