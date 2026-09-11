"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { addLinkToSelection, EditProvider } from "src/app/_components/Editable";
import AboutBody from "src/app/_components/pages/AboutBody";
import ContactBody from "src/app/_components/pages/ContactBody";
import ExhibitionsBody from "src/app/_components/pages/ExhibitionsBody";
import HomeBody from "src/app/_components/pages/HomeBody";
import PrintsBody from "src/app/_components/pages/PrintsBody";
import SidebarBody, {
  type NavKey,
} from "src/app/_components/pages/SidebarBody";
import {
  Button,
  cardCls,
  Field,
  inputCls,
  PageHeader,
} from "src/app/admin/_components/ui";
import { PRINT_COPY_FIELDS } from "src/lib/content-keys";
import { groupExhibitions } from "src/lib/exhibitions";
import { api } from "src/trpc/react";

const TABS: { key: NavKey; label: string }[] = [
  { key: "series", label: "Home" },
  { key: "about", label: "About" },
  { key: "contact", label: "Contact" },
  { key: "prints", label: "Prints" },
  { key: "exhibitions", label: "Exhibitions" },
];

/** Edits shared page copy with drafts preserved across tabs until saved or discarded. */
export default function AdminPagesEditor() {
  const utils = api.useUtils();
  const content = api.content.list.useQuery();
  const series = api.series.list.useQuery();
  const prints = api.prints.list.useQuery();
  const exhibitions = api.exhibitions.list.useQuery();
  const save = api.content.save.useMutation();

  const [tab, setTab] = useState<NavKey>("series");
  const [resetKey, setResetKey] = useState(0);
  const [dirtyCount, setDirtyCount] = useState(0);
  // Drafts live in a ref so typing never re-renders the editable regions
  // (which would fight the caret); dirtyCount drives the save bar.
  const drafts = useRef(new Map<string, string>());

  const baseline = useMemo(
    () => Object.fromEntries((content.data ?? []).map((f) => [f.key, f.value])),
    [content.data],
  );
  const labels = useMemo(
    () => Object.fromEntries((content.data ?? []).map((f) => [f.key, f.label])),
    [content.data],
  );

  const edit = useMemo(
    () => ({
      getInitial: (key: string, fallback: string) =>
        drafts.current.get(key) ?? baseline[key] ?? fallback,
      setDraft: (key: string, value: string) => {
        if ((baseline[key] ?? "") === value) drafts.current.delete(key);
        else drafts.current.set(key, value);
        setDirtyCount(drafts.current.size);
      },
      getLabel: (key: string) => labels[key] ?? key,
      resetKey,
    }),
    [baseline, labels, resetKey],
  );

  const discard = useCallback(() => {
    drafts.current.clear();
    setDirtyCount(0);
    setResetKey((k) => k + 1);
  }, []);

  const saveAll = useCallback(() => {
    const entries = [...drafts.current].map(([key, value]) => ({
      key,
      value,
    }));
    if (entries.length === 0) return;
    save.mutate(
      { entries },
      {
        onSuccess: () => {
          void utils.content.list.invalidate().then(() => {
            // Drop only what this save persisted — edits made while the
            // save was in flight stay dirty and re-render via getInitial.
            for (const e of entries) {
              if (drafts.current.get(e.key) === e.value) {
                drafts.current.delete(e.key);
              }
            }
            setDirtyCount(drafts.current.size);
            setResetKey((k) => k + 1);
          });
        },
      },
    );
  }, [save, utils]);

  const loading =
    content.isLoading ||
    series.isLoading ||
    prints.isLoading ||
    exhibitions.isLoading;

  if (loading) {
    return <p className="text-ash font-mono text-[11px]">Loading…</p>;
  }

  const loadError =
    content.error ?? series.error ?? prints.error ?? exhibitions.error;
  if (loadError) {
    return (
      <p className="font-mono text-[11px] text-red-700">
        Failed to load: {loadError.message}
      </p>
    );
  }

  const homeCards = (series.data ?? []).map((s) => ({
    slug: s.slug,
    title: s.title,
    coverImage: s.coverImage,
    coverWidth: s.coverWidth,
    coverHeight: s.coverHeight,
    workCount: s.workCount,
  }));
  const printGroups = (prints.data ?? []).filter((g) => g.prints.length > 0);
  const previewPrintGroups = printGroups.map((g) => ({
    id: g.id,
    title: g.title,
    prints: g.prints.map((p) => ({
      id: p.id,
      title: p.title,
      image: p.image,
      imageWidth: p.imageWidth,
      imageHeight: p.imageHeight,
      spec: p.spec,
      edition: p.edition,
      priceCents: p.priceCents,
      remaining: p.remaining,
    })),
  }));
  const exhibitionGroups = groupExhibitions(exhibitions.data ?? []);

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Pages"
        description="Click any text with a dashed outline to edit it in place. In longer passages, Enter starts a new paragraph. Select body copy and choose Add link to attach a web or email URL. Artwork, prints and exhibition entries are managed in their own sections."
        actions={
          <>
            <span className="text-ash font-mono text-[10px]">
              {dirtyCount > 0
                ? `${dirtyCount} unsaved change${dirtyCount === 1 ? "" : "s"}`
                : save.isSuccess
                  ? "Saved."
                  : ""}
            </span>
            <Button
              variant="ghost"
              // Keep the preview selection active while the toolbar is used.
              onMouseDown={(event) => event.preventDefault()}
              onClick={addLinkToSelection}
            >
              Add link
            </Button>
            <Button
              variant="ghost"
              onClick={discard}
              disabled={dirtyCount === 0}
            >
              Discard
            </Button>
            <Button
              onClick={saveAll}
              disabled={dirtyCount === 0 || save.isPending}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </>
        }
      />
      {save.error && (
        <p className="mb-4 font-mono text-[11px] text-red-700">
          {save.error.message}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${
              tab === t.key
                ? "bg-clay/12 text-clay"
                : "text-stone hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <EditProvider value={edit}>
        {tab === "prints" && (
          <section className={`${cardCls} mb-6 p-6`}>
            <h2 className="text-[24px]">Print details & order confirmation</h2>
            <p className="text-stone mt-2 mb-6 text-[14px]">
              This copy is shared by all prints. Use Save above to publish
              changes. Edit each print’s image, size and price under Prints.
              Border wording does not change the 2-inch border used to calculate
              paper sizes; edition wording does not change inventory limits.
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              {PRINT_COPY_FIELDS.map((field) => (
                <Field key={`${resetKey}:${field.key}`} label={field.label}>
                  <textarea
                    className={inputCls}
                    rows={field.multiline ? 3 : 1}
                    defaultValue={edit.getInitial(field.key, field.default)}
                    onChange={(event) =>
                      edit.setDraft(field.key, event.target.value)
                    }
                  />
                </Field>
              ))}
            </div>
          </section>
        )}
        <div
          className={`cms-preview overflow-auto ${cardCls}`}
          title="Not editable here — artwork, prints and exhibition entries are managed in their own admin sections."
          // The previews are the real page components; swallow link clicks so
          // editing text inside a link doesn't navigate away.
          onClickCapture={(e) => {
            if ((e.target as HTMLElement).closest("a")) e.preventDefault();
          }}
        >
          <div className="bg-paper text-ink flex min-w-[860px] flex-col md:flex-row">
            <SidebarBody active={tab} content={baseline} />
            {tab === "series" && (
              <HomeBody cards={homeCards} content={baseline} />
            )}
            {tab === "about" && <AboutBody content={baseline} />}
            {tab === "contact" && <ContactBody content={baseline} />}
            {tab === "prints" && (
              <PrintsBody
                groups={previewPrintGroups}
                content={baseline}
                checkoutEnabled={false}
              />
            )}
            {tab === "exhibitions" && (
              <ExhibitionsBody groups={exhibitionGroups} content={baseline} />
            )}
          </div>
        </div>
      </EditProvider>
    </div>
  );
}
