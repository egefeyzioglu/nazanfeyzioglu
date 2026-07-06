"use client";

import Link from "next/link";
import { useState } from "react";

import ImageField, {
  type ImageValue,
} from "src/app/admin/_components/ImageField";
import {
  Button,
  Field,
  inputCls,
  movedIds,
  RowControls,
} from "src/app/admin/_components/ui";
import { api } from "src/trpc/react";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminSeriesPage() {
  const utils = api.useUtils();
  const invalidate = () => utils.series.list.invalidate();

  const list = api.series.list.useQuery();
  const create = api.series.create.useMutation({ onSuccess: invalidate });
  const del = api.series.delete.useMutation({ onSuccess: invalidate });
  const reorder = api.series.reorder.useMutation({ onSuccess: invalidate });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [cover, setCover] = useState<ImageValue | null>(null);
  const [showForm, setShowForm] = useState(false);

  const rows = list.data ?? [];
  const ids = rows.map((r) => r.id);

  function move(index: number, direction: -1 | 1) {
    const next = movedIds(ids, index, direction);
    if (next) reorder.mutate({ ids: next });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cover) return;
    create.mutate(
      {
        title,
        slug,
        coverImage: cover.image,
        coverWidth: cover.width,
        coverHeight: cover.height,
        statusNote: statusNote.trim() || null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setSlug("");
          setSlugEdited(false);
          setStatusNote("");
          setCover(null);
          setShowForm(false);
        },
      },
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-light">Series</h1>
        <Button variant="ghost" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New series"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="mt-6 flex flex-col gap-4 border border-line bg-white/40 p-5"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Title">
              <input
                className={inputCls}
                value={title}
                required
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugEdited) setSlug(slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Slug (URL)">
              <input
                className={inputCls}
                value={slug}
                required
                pattern="[a-z0-9-]+"
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
              />
            </Field>
            <Field label="Status note (optional, e.g. “in progress”)">
              <input
                className={inputCls}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </Field>
          </div>
          <ImageField label="Cover image" value={cover} onChange={setCover} />
          {create.error && (
            <p className="font-mono text-[11px] text-red-700">
              {create.error.message}
            </p>
          )}
          <div>
            <Button type="submit" disabled={create.isPending || !cover}>
              {create.isPending ? "Creating…" : "Create series"}
            </Button>
          </div>
        </form>
      )}

      {list.isLoading && (
        <p className="mt-8 font-mono text-[11px] text-ash">Loading…</p>
      )}

      <div className="mt-6 flex flex-col">
        {rows.map((s, i) => (
          <div
            key={s.id}
            className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-5 border-b border-line-soft py-4"
          >
            <div className="border border-line bg-panel">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.coverImage}
                alt={`${s.title} cover`}
                className="block h-auto w-full"
              />
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/series/${s.id}`}
                className="hover-clay font-spectral text-[20px] italic"
              >
                {s.title}
              </Link>
              <div className="mt-1 font-mono text-[10.5px] tracking-[0.06em] text-stone-2">
                /series/{s.slug} · {s.workCount} works · {s.printCount} prints
                {s.statusNote ? ` · ${s.statusNote}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/series/${s.id}`}
                className="hover-clay font-mono text-[11px] tracking-[0.1em] text-stone uppercase"
              >
                Edit
              </Link>
              <RowControls
                onUp={i > 0 ? () => move(i, -1) : undefined}
                onDown={i < rows.length - 1 ? () => move(i, 1) : undefined}
                onDelete={() => del.mutate({ id: s.id })}
                disabled={reorder.isPending || del.isPending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
