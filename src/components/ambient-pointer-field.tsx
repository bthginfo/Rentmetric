"use client";

import { useEffect, useRef } from "react";

/**
 * A deliberately tiny interaction layer: the shell stays server-rendered while
 * fine pointers can lend the mineral canvas a little spatial awareness.
 */
export function AmbientPointerField() {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const shell = field?.closest<HTMLElement>(".app-shell");
    if (!field || !shell) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const forcedColors = window.matchMedia("(forced-colors: active)");
    let frame = 0;
    let hasPointerPosition = false;

    const updateAvailability = () => {
      const available =
        finePointer.matches && !reducedMotion.matches && !forcedColors.matches;
      shell.dataset.ambientPointer =
        available && hasPointerPosition ? "active" : "disabled";
    };

    const updatePointer = (event: PointerEvent) => {
      if (!finePointer.matches || reducedMotion.matches || forcedColors.matches)
        return;
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      hasPointerPosition = true;
      shell.dataset.ambientPointer = "active";
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        shell.style.setProperty("--ambient-x", `${x.toFixed(2)}%`);
        shell.style.setProperty("--ambient-y", `${y.toFixed(2)}%`);
        shell.style.setProperty("--ambient-shift-x", `${((event.clientX / window.innerWidth) * 4 - 2).toFixed(2)}px`);
        shell.style.setProperty("--ambient-shift-y", `${((event.clientY / window.innerHeight) * 4 - 2).toFixed(2)}px`);
      });
    };

    updateAvailability();
    window.addEventListener("pointermove", updatePointer, { passive: true });
    finePointer.addEventListener("change", updateAvailability);
    reducedMotion.addEventListener("change", updateAvailability);
    forcedColors.addEventListener("change", updateAvailability);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", updatePointer);
      finePointer.removeEventListener("change", updateAvailability);
      reducedMotion.removeEventListener("change", updateAvailability);
      forcedColors.removeEventListener("change", updateAvailability);
    };
  }, []);

  return (
    <div ref={fieldRef} className="ambient-pointer-field" aria-hidden="true" />
  );
}
