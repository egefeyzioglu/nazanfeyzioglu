"use client";

/** Shared admin form styling and small controls. */

export const inputCls =
  "w-full border border-line bg-white/60 px-3 py-2 font-mono text-[12px] text-ink outline-none focus:border-clay";

export const labelCls =
  "mb-1 block font-mono text-[10px] tracking-[0.18em] text-ash uppercase";

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
    primary: "bg-ink text-paper",
    ghost: "border border-line text-stone hover:border-clay hover:text-clay",
    danger: "border border-line text-stone hover:border-red-700 hover:text-red-700",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 font-mono text-[11px] tracking-[0.12em] uppercase disabled:opacity-40 ${styles}`}
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
  const btn =
    "border border-line px-2 py-1 font-mono text-[11px] text-stone hover:border-clay hover:text-clay disabled:opacity-30";
  return (
    <div className="flex items-center gap-1">
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
        className="border border-line px-2 py-1 font-mono text-[11px] text-stone hover:border-red-700 hover:text-red-700 disabled:opacity-30"
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
