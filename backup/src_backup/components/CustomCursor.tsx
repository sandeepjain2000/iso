"use client";

import { useEffect, useRef, useState } from "react";

const LERP = 0.28;
const CURSOR_HTML_CLASS = "cc-custom-cursor";

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  '[role="button"]:not([aria-disabled="true"])',
  "input[type=\"submit\"]:not([disabled])",
  "input[type=\"button\"]:not([disabled])",
  "label[for]",
  "select",
  "textarea",
  ".btn-primary",
  ".btn-secondary",
  "[data-cursor-hover]",
].join(",");

function isFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function underPointerIsInteractive(clientX: number, clientY: number): boolean {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return false;
  return el.closest(INTERACTIVE_SELECTOR) != null;
}

/**
 * Custom dot cursor with lerped follow + scale on interactive targets.
 * Off for touch-style pointers and `prefers-reduced-motion` (accessibility).
 */
export function CustomCursor() {
  const [active, setActive] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const hover = useRef(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!isFinePointer() || prefersReducedMotion()) return;

    setActive(true);
    const root = document.documentElement;
    root.classList.add(CURSOR_HTML_CLASS);

    const tick = () => {
      const cur = current.current;
      const tgt = target.current;
      cur.x += (tgt.x - cur.x) * LERP;
      cur.y += (tgt.y - cur.y) * LERP;
      const el = dotRef.current;
      if (el) {
        const h = hover.current;
        const scale = h ? 1.65 : 1;
        const glow = h
          ? "0 0 0 1px rgba(163, 163, 163, 0.45), 0 0 24px rgba(0, 0, 0, 0.12)"
          : "0 0 0 1px rgba(212, 212, 216, 0.6)";
        el.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0) translate(-50%, -50%) scale(${scale})`;
        el.style.boxShadow = glow;
      }
      raf.current = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      hover.current = underPointerIsInteractive(e.clientX, e.clientY);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
      root.classList.remove(CURSOR_HTML_CLASS);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[10050]"
    >
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 h-2 w-2 rounded-full bg-neutral-900/85 will-change-transform"
        style={{
          transform: "translate3d(0,0,0) translate(-50%, -50%) scale(1)",
        }}
      />
    </div>
  );
}
