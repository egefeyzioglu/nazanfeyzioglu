"use client";

import { useState } from "react";

import ImageField, {
  type ImageValue,
} from "src/app/admin/_components/ImageField";
import {
  Button,
  cardCls,
  CollapsibleRowCard,
  Field,
  inputCls,
  movedIds,
  PageHeader,
  RowControls,
} from "src/app/admin/_components/ui";
import {
  centsToDollarsString,
  dollarsStringToCents,
  formatPrice,
} from "src/lib/orders";
import { api } from "src/trpc/react";
import {
  formatPrintSpec,
  getPrintSizes,
  type PrintDimensions,
} from "src/lib/prints";

type PrintRow = PrintDimensions & {
  id: number;
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  spec: string;
  edition: string;
  priceCents: number | null;
  editionSize: number | null;
};

type PrintFormValues = Omit<PrintRow, "id" | "spec">;

/** Manages print records and their order within each series. */
export default function AdminPrintsPage() {
  const utils = api.useUtils();
  const invalidate = () => utils.prints.list.invalidate();

  const list = api.prints.list.useQuery();
  const create = api.prints.create.useMutation({ onSuccess: invalidate });
  const update = api.prints.update.useMutation({ onSuccess: invalidate });
  const del = api.prints.delete.useMutation({ onSuccess: invalidate });
  const reorder = api.prints.reorder.useMutation({ onSuccess: invalidate });

  const [addingFor, setAddingFor] = useState<number | null>(null);

  if (list.isLoading) {
    return <p className="text-ash font-mono text-[11px]">Loading…</p>;
  }
  if (list.error) {
    return (
      <p className="font-mono text-[11px] text-red-700">
        Failed to load: {list.error.message}
      </p>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Prints"
        description="Signed limited-edition prints, grouped by series. Create a series first to list prints under it."
      />

      <div className="flex flex-col gap-10">
        {(list.data ?? []).map((group) => {
          const ids = group.prints.map((p) => p.id);
          return (
            <section key={group.id}>
              <div className="border-line flex items-baseline justify-between border-b pb-3">
                <div className="font-spectral text-[21px] italic">
                  {group.title}
                </div>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setAddingFor(addingFor === group.id ? null : group.id)
                  }
                >
                  {addingFor === group.id ? "Cancel" : "+ Add print"}
                </Button>
              </div>

              {addingFor === group.id && (
                <div className={`mt-4 p-6 ${cardCls}`}>
                  <PrintForm
                    pending={create.isPending}
                    error={create.error?.message}
                    submitLabel="Add print"
                    onSubmit={(values) =>
                      create.mutate(
                        { seriesId: group.id, ...values },
                        { onSuccess: () => setAddingFor(null) },
                      )
                    }
                  />
                </div>
              )}

              <div className="mt-3 flex flex-col gap-3">
                {group.prints.map((p, i) => (
                  <PrintCard
                    key={p.id}
                    print={p}
                    pending={update.isPending && update.variables?.id === p.id}
                    error={
                      update.variables?.id === p.id
                        ? update.error?.message
                        : undefined
                    }
                    onSave={(values) => update.mutate({ id: p.id, ...values })}
                    controls={
                      <RowControls
                        onUp={
                          i > 0
                            ? () => {
                                const next = movedIds(ids, i, -1);
                                if (next)
                                  reorder.mutate({
                                    seriesId: group.id,
                                    ids: next,
                                  });
                              }
                            : undefined
                        }
                        onDown={
                          i < group.prints.length - 1
                            ? () => {
                                const next = movedIds(ids, i, 1);
                                if (next)
                                  reorder.mutate({
                                    seriesId: group.id,
                                    ids: next,
                                  });
                              }
                            : undefined
                        }
                        onDelete={() => del.mutate({ id: p.id })}
                        disabled={reorder.isPending || del.isPending}
                      />
                    }
                  />
                ))}
                {group.prints.length === 0 && (
                  <p className="text-ash font-mono text-[10.5px]">
                    No prints in this series yet.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Creates or updates a print's artwork, image dimensions, pricing and edition data. */
function PrintForm({
  initial,
  onSubmit,
  pending,
  error,
  submitLabel,
}: {
  initial?: PrintRow;
  onSubmit: (values: PrintFormValues) => void;
  pending: boolean;
  error?: string;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [width, setWidth] = useState(
    initial?.imageWidthInches?.toString() ?? "",
  );
  const [height, setHeight] = useState(
    initial?.imageHeightInches?.toString() ?? "",
  );
  const dimensions = {
    imageWidthInches: width.trim() === "" ? null : Number(width),
    imageHeightInches: height.trim() === "" ? null : Number(height),
  };
  const sizes = getPrintSizes(dimensions);
  const [edition, setEdition] = useState(initial?.edition ?? "");
  const [price, setPrice] = useState(centsToDollarsString(initial?.priceCents));
  const [editionSize, setEditionSize] = useState(
    initial?.editionSize === null || initial?.editionSize === undefined
      ? ""
      : initial.editionSize.toString(),
  );
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
          ...dimensions,
          edition,
          priceCents: dollarsStringToCents(price),
          editionSize:
            editionSize.trim() === "" ? null : parseInt(editionSize, 10),
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
        <Field label="Image width (inches, excluding the border)">
          <input
            type="number"
            min="0.000001"
            step="any"
            className={inputCls}
            value={width}
            required={height.trim() !== ""}
            placeholder="24"
            onChange={(e) => setWidth(e.target.value)}
          />
        </Field>
        <Field label="Image height (inches, excluding the border)">
          <input
            type="number"
            min="0.000001"
            step="any"
            className={inputCls}
            value={height}
            required={width.trim() !== ""}
            placeholder="36"
            onChange={(e) => setHeight(e.target.value)}
          />
        </Field>
        <Field label="Edition">
          <input
            className={inputCls}
            value={edition}
            required
            placeholder="Edition of 20 · 1:1 scale"
            onChange={(e) => setEdition(e.target.value)}
          />
        </Field>
        <Field label="Price (CAD, blank = not for sale)">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="Edition size (blank = unlimited)">
          <input
            type="number"
            min="1"
            step="1"
            className={inputCls}
            value={editionSize}
            onChange={(e) => setEditionSize(e.target.value)}
          />
        </Field>
      </div>
      <p className="text-stone text-[14px]" aria-live="polite">
        {formatPrintSpec(dimensions)}. Overall paper size:{" "}
        {sizes?.paper ?? "To be confirmed"}. Includes a 2-inch white border on
        all sides. Leave both dimensions blank if unknown.
      </p>
      <ImageField label="Print image" value={image} onChange={setImage} />
      {initial?.imageWidthInches === null &&
        initial.imageHeightInches === null && (
          <p className="text-stone text-[14px]">
            Previous specification (for reference): {initial.spec}
          </p>
        )}
      {error && <p className="font-mono text-[11px] text-red-700">{error}</p>}
      <div>
        <Button type="submit" disabled={pending || !image}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Displays a print summary with an expandable editor for its physical dimensions and sale data. */
function PrintCard({
  print,
  onSave,
  pending,
  error,
  controls,
}: {
  print: PrintRow;
  onSave: (values: PrintFormValues) => void;
  pending: boolean;
  error?: string;
  controls: React.ReactNode;
}) {
  return (
    <CollapsibleRowCard
      thumb={
        <div className="border-line bg-panel overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={print.image}
            alt={print.title}
            className="block aspect-square h-auto w-full object-cover"
          />
        </div>
      }
      title={print.title}
      subtitle={`${formatPrintSpec(print)} · ${print.edition} · ${
        print.priceCents === null ? "$ —" : formatPrice(print.priceCents)
      }${print.editionSize !== null ? ` · limit ${print.editionSize}` : ""}`}
      controls={controls}
    >
      <PrintForm
        key={print.id}
        initial={print}
        onSubmit={onSave}
        pending={pending}
        error={error}
        submitLabel="Save print"
      />
    </CollapsibleRowCard>
  );
}
