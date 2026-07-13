"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

const interactiveSelector = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "form",
  "[role='button']",
  "[role='link']",
  "[contenteditable='true']",
].join(",");

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(interactiveSelector));
}

export function ClickableTableRow({
  href,
  label,
  children,
  className = "",
}: {
  href: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const navigate = () => router.push(href);

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    if (event.defaultPrevented || isInteractiveTarget(event.target)) return;
    navigate();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (isInteractiveTarget(event.target)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    navigate();
  }

  return (
    <tr
      className={`clickable-row ${className}`.trim()}
      tabIndex={0}
      aria-label={label}
      aria-keyshortcuts="Enter Space"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerEnter={() => router.prefetch(href)}
    >
      {children}
    </tr>
  );
}
