"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ImageField, {
  type ImageValue,
} from "src/app/admin/_components/ImageField";
import {
  Button,
  cardCls,
  Field,
  inputCls,
  labelCls,
  movedIds,
  RowControls,
} from "src/app/admin/_components/ui";
import { api } from "src/trpc/react";

type WorkRow = {
  id: number;
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  medium: string;
  price: string | null;
  digital: boolean;
  note: string | null;
};

export default function SeriesEditor({ id }: { id: number }) {
  const utils = api.useUtils();
  const invalidate = () => {
    void utils.series.byId.invalidate({ id });
    void utils.series.list.invalidate();
  };

  const query = api.series.byId.useQuery({ id });
  const updateSeries = api.series.update.useMutation({ onSuccess: invalidate });
  const createWork = api.works.create.useMutation({ onSuccess: invalidate });
  const updateWork = api.works.update.useMutation({ onSuccess: invalidate });
  const deleteWork = api.works.delete.useMutation({ onSuccess: invalidate });
  const reorderWorks = api.works.reorder.useMutation({ onSuccess: invalidate });

  const s = query.data;

  // Series form state, initialised once the query resolves.
  const [form, setForm] = useState<{
    title: string;
    slug: string;
    statusNote: string;
    cover: ImageValue | null;
  } | null>(null);
  useEffect(() => {
    if (s && !form) {
      setForm({
        title: s.title,
        slug: s.slug,
        statusNote: s.statusNote ?? "",
        cover: {
          image: s.coverImage,
          width: s.coverWidth,
          height: s.coverHeight,
        },
      });
    }
  }, [s, form]);

  const [addingWork, setAddingWork] = useState(false);

  if (query.isLoading) {
    return <p className="font-mono text-[11px] text-ash">Loading…</p>;
  }
  if (!s) {
    return (
      <p className="font-mono text-[11px] text-ash">
        Series not found.{" "}
        <Link href="/admin/series" className="text-clay">
          Back to series
        </Link>
      </p>
    );
  }

  const workIds = s.works.map((w) => w.id);

  return (
    <div>
      <Link
        href="/admin/series"
        className="hover-clay font-mono text-[11px] tracking-[0.14em] text-stone uppercase"
      >
        ← All series
      </Link>
      <h1 className="mt-4 mb-6 font-spectral text-[30px] leading-none font-light tracking-[-0.01em]">
        {s.title}
      </h1>

      {form && (
        <form
          className={`flex flex-col gap-4 p-6 ${cardCls}`}
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.cover) return;
            updateSeries.mutate({
              id,
              title: form.title,
              slug: form.slug,
              statusNote: form.statusNote.trim() || null,
              coverImage: form.cover.image,
              coverWidth: form.cover.width,
              coverHeight: form.cover.height,
            });
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Title">
              <input
                className={inputCls}
                value={form.title}
                required
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Slug (URL)">
              <input
                className={inputCls}
                value={form.slug}
                required
                pattern="[a-z0-9\-]+"
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </Field>
            <Field label="Status note (optional)">
              <input
                className={inputCls}
                value={form.statusNote}
                onChange={(e) =>
                  setForm({ ...form, statusNote: e.target.value })
                }
              />
            </Field>
          </div>
          <ImageField
            label="Cover image"
            value={form.cover}
            onChange={(cover) => setForm({ ...form, cover })}
          />
          {updateSeries.error && (
            <p className="font-mono text-[11px] text-red-700">
              {updateSeries.error.message}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={updateSeries.isPending}>
              {updateSeries.isPending ? "Saving…" : "Save series"}
            </Button>
            {updateSeries.isSuccess && !updateSeries.isPending && (
              <span className="font-mono text-[10px] text-ash">Saved.</span>
            )}
          </div>
        </form>
      )}

      <div className="mt-12 mb-4 flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="font-spectral text-[21px] font-light">
          Works{" "}
          <span className="font-mono text-[12px] text-ash">
            ({s.works.length})
          </span>
        </h2>
        <Button variant="ghost" onClick={() => setAddingWork((v) => !v)}>
          {addingWork ? "Cancel" : "+ Add work"}
        </Button>
      </div>

      {addingWork && (
        <div className={`mb-4 p-6 ${cardCls}`}>
          <WorkForm
            pending={createWork.isPending}
            error={createWork.error?.message}
            onSubmit={(values) =>
              createWork.mutate(
                { seriesId: id, ...values },
                { onSuccess: () => setAddingWork(false) },
              )
            }
            submitLabel="Add work"
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {s.works.map((w, i) => (
          <WorkCard
            key={w.id}
            work={w}
            pending={updateWork.isPending && updateWork.variables?.id === w.id}
            error={
              updateWork.variables?.id === w.id
                ? updateWork.error?.message
                : undefined
            }
            onSave={(values) => updateWork.mutate({ id: w.id, ...values })}
            controls={
              <RowControls
                onUp={
                  i > 0
                    ? () => {
                        const next = movedIds(workIds, i, -1);
                        if (next)
                          reorderWorks.mutate({ seriesId: id, ids: next });
                      }
                    : undefined
                }
                onDown={
                  i < s.works.length - 1
                    ? () => {
                        const next = movedIds(workIds, i, 1);
                        if (next)
                          reorderWorks.mutate({ seriesId: id, ids: next });
                      }
                    : undefined
                }
                onDelete={() => deleteWork.mutate({ id: w.id })}
                disabled={reorderWorks.isPending || deleteWork.isPending}
              />
            }
          />
        ))}
      </div>
    </div>
  );
}

type WorkFormValues = {
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  medium: string;
  price: string | null;
  digital: boolean;
  note: string | null;
};

function WorkForm({
  initial,
  onSubmit,
  pending,
  error,
  submitLabel,
}: {
  initial?: WorkRow;
  onSubmit: (values: WorkFormValues) => void;
  pending: boolean;
  error?: string;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [medium, setMedium] = useState(initial?.medium ?? "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [digital, setDigital] = useState(initial?.digital ?? false);
  const [note, setNote] = useState(initial?.note ?? "");
  const [image, setImage] = useState<ImageValue | null>(
    initial
      ? {
          image: initial.image,
          width: initial.imageWidth,
          height: initial.imageHeight,
        }
      : null,
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!image) return;
        onSubmit({
          title,
          image: image.image,
          imageWidth: image.width,
          imageHeight: image.height,
          medium,
          price: price.trim() || null,
          digital,
          note: note.trim() || null,
        });
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Title">
          <input
            className={inputCls}
            value={title}
            required
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Medium line (medium · size · year)">
          <input
            className={inputCls}
            value={medium}
            required
            placeholder="Acrylic on cradled panel · 24 × 36 in · 2026"
            onChange={(e) => setMedium(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
        <Field label="Price (blank for digital-only)">
          <input
            className={inputCls}
            value={price}
            placeholder="1,900 CAD"
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-clay"
            checked={digital}
            onChange={(e) => setDigital(e.target.checked)}
          />
          <span className={`${labelCls} mb-0`}>
            Digital edition (original in preparation)
          </span>
        </label>
      </div>
      {digital && (
        <Field label="Digital edition note">
          <textarea
            className={`${inputCls} min-h-[60px]`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      )}
      <ImageField label="Artwork image" value={image} onChange={setImage} />
      {error && <p className="font-mono text-[11px] text-red-700">{error}</p>}
      <div>
        <Button type="submit" disabled={pending || !image}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function WorkCard({
  work,
  onSave,
  pending,
  error,
  controls,
}: {
  work: WorkRow;
  onSave: (values: WorkFormValues) => void;
  pending: boolean;
  error?: string;
  controls: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cardCls}>
      <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 p-3">
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={work.image}
            alt=""
            className="block aspect-square h-auto w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="font-spectral text-[17px] italic">{work.title}</div>
          <div className="mt-[2px] truncate font-mono text-[10.5px] text-stone-2">
            {work.medium} · {work.digital ? "digital" : (work.price ?? "—")}
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
      {open && (
        <div className="border-t border-line-soft p-6">
          <WorkForm
            key={work.id}
            initial={work}
            onSubmit={onSave}
            pending={pending}
            error={error}
            submitLabel="Save work"
          />
        </div>
      )}
    </div>
  );
}
