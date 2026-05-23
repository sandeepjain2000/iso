"use client";

import { Info } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Inline info control: no layout space for help text until opened (click).
 */
export function InfoHint({
  children,
  className,
  contentClassName,
  label = "More information",
}: {
  children: ReactNode;
  className?: string;
  /** Panel typography (default slate-admin). */
  contentClassName?: string;
  label?: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <button
        ref={btnRef}
        type="button"
        className="rounded-full p-0.5 text-slate-500 outline-none transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Info className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        <span className="sr-only">{label}</span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Dismiss"
            onClick={() => setOpen(false)}
          />
          <span
            id={panelId}
            role="tooltip"
            className={cn(
              "absolute left-1/2 top-full z-50 mt-1.5 w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed text-slate-600 shadow-lg [&_strong]:font-semibold [&_strong]:text-slate-800",
              contentClassName,
            )}
          >
            {children}
          </span>
        </>
      ) : null}
    </span>
  );
}
