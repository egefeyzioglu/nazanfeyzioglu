"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Button,
  Field,
  inputCls,
  PageHeader,
} from "src/app/admin/_components/ui";
import {
  centsToDollarsString,
  dollarsStringToCents,
  formatPrice,
} from "src/lib/orders";
import { api } from "src/trpc/react";

export default function AdminOriginalsPage() {
  const list = api.works.originals.useQuery();
  return (
    <div>
      <PageHeader
        title="Originals"
        description="One-of-a-kind works with free shipping within Canada. Set a price to enable checkout; leave it blank for inquiries. Manage purchases and fulfillment in Orders."
        actions={
          <Link
            href="/admin/series"
            className="text-clay font-mono text-[11px] underline"
          >
            Add artwork in Series
          </Link>
        }
      />
      {list.isLoading && (
        <p className="text-ash font-mono text-[11px]">Loading…</p>
      )}
      {list.error && (
        <p role="alert" className="font-mono text-[11px] text-red-700">
          {list.error.message}
        </p>
      )}
      {list.data?.map((group) => (
        <section key={group.id} className="mb-8">
          <h2 className="font-spectral mb-4 text-[24px] italic">
            {group.title}
          </h2>
          <div className="flex flex-col gap-3">
            {group.works.map((work) => (
              <OriginalRow
                key={`${work.id}:${work.originalPriceCents}:${work.originalUnavailable}`}
                work={work}
              />
            ))}
          </div>
        </section>
      ))}
      {list.data?.length === 0 && (
        <p className="text-ash font-mono text-[11px]">
          No originals yet. Add a work in Series and leave “Digital edition”
          unchecked.
        </p>
      )}
    </div>
  );
}

function OriginalRow({
  work,
}: {
  work: {
    id: number;
    seriesId: number;
    title: string;
    image: string;
    price: string | null;
    originalPriceCents: number | null;
    originalUnavailable: boolean;
    originalSold: boolean;
  };
}) {
  const utils = api.useUtils();
  const [price, setPrice] = useState(
    centsToDollarsString(work.originalPriceCents),
  );
  const [unavailable, setUnavailable] = useState(work.originalUnavailable);
  const [validationError, setValidationError] = useState<string | null>(null);
  const save = api.works.setOriginalSale.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.works.originals.invalidate(),
        utils.series.byId.invalidate({ id: work.seriesId }),
      ]);
    },
  });
  return (
    <article className="border-line rounded-xl border bg-white p-5">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={work.image}
          alt={work.title}
          className="h-20 w-20 object-contain"
        />
        <div>
          <h3 className="font-spectral text-[22px] italic">{work.title}</h3>
          <p className="text-stone mt-1 font-mono text-[11px]">
            {work.originalSold
              ? "Sold"
              : work.originalUnavailable
                ? "Unavailable"
                : work.originalPriceCents === null
                  ? "Inquiry only"
                  : `Available · ${formatPrice(work.originalPriceCents)}`}
          </p>
          {work.originalPriceCents === null && work.price && (
            <p className="text-ash mt-1 font-mono text-[11px]">
              Current display price: {work.price}
            </p>
          )}
          <Link
            href={`/admin/series/${work.seriesId}`}
            className="text-clay mt-2 inline-block font-mono text-[11px] underline"
          >
            Edit artwork
          </Link>
        </div>
      </div>
      <form
        className="mt-5 flex flex-wrap items-end gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const cents = dollarsStringToCents(price);
          if (
            price.trim() &&
            (cents === null || cents <= 0 || cents > 99999999)
          ) {
            setValidationError(
              "Enter a price from 0.01 to 999,999.99 CAD, or leave blank.",
            );
            return;
          }
          setValidationError(null);
          save.mutate({
            id: work.id,
            originalPriceCents: cents,
            originalUnavailable: unavailable,
          });
        }}
      >
        <Field label="Checkout price (CAD)">
          <input
            type="number"
            min="0.01"
            max="999999.99"
            step="0.01"
            className={inputCls}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Inquiry only"
          />
        </Field>
        <label className="text-stone flex items-center gap-2 pb-3 font-mono text-[11px]">
          <input
            type="checkbox"
            checked={unavailable}
            onChange={(event) => setUnavailable(event.target.checked)}
            className="accent-clay"
          />
          Unavailable / sold elsewhere
        </label>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </form>
      {work.originalSold && (
        <p className="text-ash mt-3 font-mono text-[11px]">
          A paid order marks this original sold. A full refund makes it
          available again unless marked unavailable here.
        </p>
      )}
      {(validationError ?? save.error) && (
        <p role="alert" className="mt-3 font-mono text-[11px] text-red-700">
          {validationError ?? save.error?.message}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="text-ash mt-3 font-mono text-[11px]">
          Saved.
        </p>
      )}
    </article>
  );
}
