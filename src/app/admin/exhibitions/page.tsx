"use client";

import { useState } from "react";

import {
  Button,
  Field,
  inputCls,
  movedIds,
  RowControls,
} from "src/app/admin/_components/ui";
import {
  EXHIBITION_CATEGORIES,
  EXHIBITION_CATEGORY_LABELS as CATEGORY_LABELS,
  type ExhibitionCategory,
} from "src/lib/exhibitions";
import { api } from "src/trpc/react";

type ExhibitionRow = {
  id: number;
  category: ExhibitionCategory;
  name: string;
  location: string;
  date: string;
};

type FormValues = Omit<ExhibitionRow, "id">;

export default function AdminExhibitionsPage() {
  const utils = api.useUtils();
  const invalidate = () => utils.exhibitions.list.invalidate();

  const list = api.exhibitions.list.useQuery();
  const create = api.exhibitions.create.useMutation({ onSuccess: invalidate });
  const update = api.exhibitions.update.useMutation({ onSuccess: invalidate });
  const del = api.exhibitions.delete.useMutation({ onSuccess: invalidate });
  const reorder = api.exhibitions.reorder.useMutation({ onSuccess: invalidate });

  const [adding, setAdding] = useState(false);

  if (list.isLoading) {
    return <p className="font-mono text-[11px] text-ash">Loading…</p>;
  }

  const rows = list.data ?? [];
  const groups = EXHIBITION_CATEGORIES.map((category) => ({
    category,
    entries: rows.filter((e) => e.category === category),
  }));

  /** Moves an entry within its category and persists the full new order. */
  function move(category: ExhibitionCategory, index: number, dir: -1 | 1) {
    const next = groups.map((g) =>
      g.category === category
        ? (movedIds(
            g.entries.map((e) => e.id),
            index,
            dir,
          ) ?? g.entries.map((e) => e.id))
        : g.entries.map((e) => e.id),
    );
    reorder.mutate({ ids: next.flat() });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-light">Exhibitions</h1>
        <Button variant="ghost" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ Add entry"}
        </Button>
      </div>

      {adding && (
        <div className="mt-6 border border-line bg-white/40 p-5">
          <ExhibitionForm
            pending={create.isPending}
            error={create.error?.message}
            submitLabel="Add entry"
            onSubmit={(values) =>
              create.mutate(values, { onSuccess: () => setAdding(false) })
            }
          />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group.category}>
            <div className="border-b border-line pb-2 font-mono text-[11px] tracking-[0.26em] text-clay uppercase">
              {CATEGORY_LABELS[group.category]}
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {group.entries.map((entry, i) => (
                <ExhibitionCard
                  key={entry.id}
                  entry={entry}
                  pending={update.isPending && update.variables?.id === entry.id}
                  error={
                    update.variables?.id === entry.id
                      ? update.error?.message
                      : undefined
                  }
                  onSave={(values) =>
                    update.mutate({ id: entry.id, ...values })
                  }
                  controls={
                    <RowControls
                      onUp={
                        i > 0 ? () => move(group.category, i, -1) : undefined
                      }
                      onDown={
                        i < group.entries.length - 1
                          ? () => move(group.category, i, 1)
                          : undefined
                      }
                      onDelete={() => del.mutate({ id: entry.id })}
                      disabled={reorder.isPending || del.isPending}
                    />
                  }
                />
              ))}
              {group.entries.length === 0 && (
                <p className="font-mono text-[10.5px] text-ash">
                  No entries yet.
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ExhibitionForm({
  initial,
  onSubmit,
  pending,
  error,
  submitLabel,
}: {
  initial?: ExhibitionRow;
  onSubmit: (values: FormValues) => void;
  pending: boolean;
  error?: string;
  submitLabel: string;
}) {
  const [category, setCategory] = useState<ExhibitionCategory>(
    initial?.category ?? "solo",
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [date, setDate] = useState(initial?.date ?? "");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ category, name, location, date });
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Section">
          <select
            className={inputCls}
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as ExhibitionCategory)
            }
          >
            {EXHIBITION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <input
            className={inputCls}
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Location">
          <input
            className={inputCls}
            value={location}
            required
            placeholder="Monat Gallery · Madrid, Spain"
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
        <Field label="Date (display text)">
          <input
            className={inputCls}
            value={date}
            required
            placeholder="September 2023"
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      {error && <p className="font-mono text-[11px] text-red-700">{error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ExhibitionCard({
  entry,
  onSave,
  pending,
  error,
  controls,
}: {
  entry: ExhibitionRow;
  onSave: (values: FormValues) => void;
  pending: boolean;
  error?: string;
  controls: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-line bg-white/40">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-3">
        <div className="min-w-0">
          <div className="font-spectral text-[17px] italic">{entry.name}</div>
          <div className="mt-[2px] truncate font-mono text-[10.5px] text-stone-2">
            {entry.location} · {entry.date}
          </div>
        </div>
        <div className="flex items-center gap-3">
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
      {open && (
        <div className="border-t border-line-soft p-5">
          <ExhibitionForm
            key={entry.id}
            initial={entry}
            onSubmit={onSave}
            pending={pending}
            error={error}
            submitLabel="Save entry"
          />
        </div>
      )}
    </div>
  );
}
