"use client";

import { useState } from "react";

/** Default visible length for long strings across the app */
export const UI_TEXT_PREVIEW_CHARS = 60;

type TruncatedTextProps = {
  text: string | number | null | undefined;
  maxChars?: number;
  className?: string;
  /** Keep newlines when expanded (control text, notes) */
  preserveLines?: boolean;
  emptyLabel?: string;
};

export function TruncatedText({
  text,
  maxChars = UI_TEXT_PREVIEW_CHARS,
  className,
  preserveLines = false,
  emptyLabel = "—",
}: TruncatedTextProps) {
  const normalized =
    text == null || text === ""
      ? ""
      : String(text).replace(/\r\n/g, "\n");

  const [expanded, setExpanded] = useState(false);

  if (!normalized) {
    return <span className={className}>{emptyLabel}</span>;
  }

  const needsTruncate = normalized.length > maxChars;
  const lineClass = preserveLines ? "whitespace-pre-wrap break-words" : "";

  if (!needsTruncate) {
    return (
      <span className={[className, lineClass].filter(Boolean).join(" ")}>
        {normalized}
      </span>
    );
  }

  const preview = normalized.slice(0, maxChars);
  const toggleClass =
    "align-baseline text-[0.85em] font-medium text-indigo-700 underline decoration-indigo-400/80 hover:text-indigo-900";

  if (expanded) {
    return (
      <span className={className} title={normalized}>
        <span className={lineClass}>{normalized}</span>{" "}
        <button
          type="button"
          className={toggleClass}
          onClick={() => setExpanded(false)}
        >
          less
        </button>
      </span>
    );
  }

  return (
    <span className={className} title={normalized}>
      <span className={lineClass}>
        {preview}
        <span aria-hidden="true">…</span>
      </span>{" "}
      <button
        type="button"
        className={toggleClass}
        onClick={() => setExpanded(true)}
      >
        more
      </button>
    </span>
  );
}
