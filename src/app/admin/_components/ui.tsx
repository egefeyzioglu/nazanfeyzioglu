"use client";

import { useState } from "react";

/** Shared admin form styling and small controls. */

/** Floating white surface used for forms, list rows and cards. */
export const cardCls =
  "rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(28,26,23,0.04),0_18px_36px_-28px_rgba(28,26,23,0.32)]";

export const inputCls =
  "w-full rounded-md border border-line-2 bg-paper px-3 py-2.5 font-mono text-[12px] text-ink outline-none transition placeholder:text-ash-2 focus:border-clay focus:ring-2 focus:ring-clay/15";

export const labelCls =
  "mb-1.5 block font-mono text-[10px] tracking-[0.18em] text-stone uppercase";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

/** Page title band shared by every admin section. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-5">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 font-mono text-[10px] tracking-[0.28em] text-clay uppercase">
            {eyebrow}
          </div>
        )}
        <h1 className="font-spectral text-[30px] leading-none font-light tracking-[-0.01em] text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-[580px] font-mono text-[11px] leading-[1.75] text-stone">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-none items-center gap-3">{actions}</div>
      )}
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const styles = {
    primary:
      "border border-ink bg-ink text-paper hover:bg-ink-soft hover:border-ink-soft",
    ghost:
      "border border-line-2 bg-white text-mute hover:border-clay hover:text-clay",
    danger:
      "border border-line-2 bg-white text-mute hover:border-red-700 hover:text-red-700",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`cursor-pointer rounded-md px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] uppercase transition disabled:cursor-default disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}

/** Up / down / delete row controls used by every sortable admin list. */
export function RowControls({
  onUp,
  onDown,
  onDelete,
  disabled,
}: {
  onUp?: () => void;
  onDown?: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const base =
    "grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-line-2 bg-white font-mono text-[12px] text-stone transition disabled:cursor-default disabled:opacity-30";
  const btn = `${base} hover:border-clay hover:text-clay`;
  const btnDanger = `${base} hover:border-red-700 hover:text-red-700`;
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={btn}
        onClick={onUp}
        disabled={disabled ?? !onUp}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        className={btn}
        onClick={onDown}
        disabled={disabled ?? !onDown}
        aria-label="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        className={btnDanger}
        onClick={() => {
          if (window.confirm("Delete this item? This cannot be undone.")) {
            onDelete();
          }
        }}
        disabled={disabled}
        aria-label="Delete"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Collapsible list row used by the print, work and exhibition editors: a card
 * with a header (optional thumbnail, title, subtitle, an Edit/Close toggle and
 * reorder/delete `controls`) that reveals `children` — the row's edit form —
 * when expanded.
 */
export function CollapsibleRowCard({
  thumb,
  title,
  subtitle,
  controls,
  children,
}: {
  thumb?: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  controls: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cardCls}>
      <div
        className={`grid items-center gap-4 ${
          thumb
            ? "grid-cols-[56px_minmax(0,1fr)_auto] p-3"
            : "grid-cols-[minmax(0,1fr)_auto] p-4"
        }`}
      >
        {thumb}
        <div className="min-w-0">
          <div className="font-spectral text-[17px] italic">{title}</div>
          <div className="mt-[2px] truncate font-mono text-[10.5px] text-stone-2">
            {subtitle}
          </div>
        </div>
        <div className="flex items-center gap-3 pr-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="hover-clay cursor-pointer font-mono text-[11px] tracking-[0.1em] text-stone uppercase"
          >
            {open ? "Close" : "Edit"}
          </button>
          {controls}
        </div>
      </div>
      {open && <div className="border-t border-line-soft p-6">{children}</div>}
    </div>
  );
}

/** Moves `ids[index]` one step and returns the new id order, or null at edges. */
export function movedIds(
  ids: number[],
  index: number,
  direction: -1 | 1,
): number[] | null {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return null;
  const next = [...ids];
  const a = next[index]!;
  next[index] = next[target]!;
  next[target] = a;
  return next;
}
