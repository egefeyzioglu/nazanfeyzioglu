"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { EditProvider } from "src/app/_components/Editable";
import AboutBody from "src/app/_components/pages/AboutBody";
import ContactBody from "src/app/_components/pages/ContactBody";
import ExhibitionsBody from "src/app/_components/pages/ExhibitionsBody";
import HomeBody from "src/app/_components/pages/HomeBody";
import PrintsBody from "src/app/_components/pages/PrintsBody";
import SidebarBody, {
  type NavKey,
} from "src/app/_components/pages/SidebarBody";
import { Button } from "src/app/admin/_components/ui";
import { groupExhibitions } from "src/lib/exhibitions";
import { api } from "src/trpc/react";

const TABS: { key: NavKey; label: string }[] = [
  { key: "series", label: "Home" },
  { key: "about", label: "About" },
  { key: "contact", label: "Contact" },
  { key: "prints", label: "Prints" },
  { key: "exhibitions", label: "Exhibitions" },
];

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
    () =>
      Object.fromEntries((content.data ?? []).map((f) => [f.key, f.value])),
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
            drafts.current.clear();
            setDirtyCount(0);
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
    return <p className="font-mono text-[11px] text-ash">Loading…</p>;
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
  const exhibitionGroups = groupExhibitions(exhibitions.data ?? []);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-light">Pages</h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-ash">
            {dirtyCount > 0
              ? `${dirtyCount} unsaved change${dirtyCount === 1 ? "" : "s"}`
              : save.isSuccess
                ? "Saved."
                : ""}
          </span>
          <Button variant="ghost" onClick={discard} disabled={dirtyCount === 0}>
            Discard
          </Button>
          <Button
            onClick={saveAll}
            disabled={dirtyCount === 0 || save.isPending}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      <p className="mt-2 font-mono text-[11px] leading-[1.8] text-stone">
        Click any text with a dashed outline to edit it in place. In longer
        passages, Enter starts a new paragraph. Artwork, prints and exhibition
        entries are managed in their own sections.
      </p>
      {save.error && (
        <p className="mt-2 font-mono text-[11px] text-red-700">
          {save.error.message}
        </p>
      )}

      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-mono text-[11px] tracking-[0.12em] uppercase ${
              tab === t.key
                ? "border border-line border-b-paper bg-paper text-ink"
                : "text-stone hover:text-clay"
            }`}
            style={tab === t.key ? { marginBottom: -1 } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      <EditProvider value={edit}>
        <div
          className="cms-preview mt-6 overflow-auto border border-line"
          // The previews are the real page components; swallow link clicks so
          // editing text inside a link doesn't navigate away.
          onClickCapture={(e) => {
            if ((e.target as HTMLElement).closest("a")) e.preventDefault();
          }}
        >
          <div className="flex min-w-[860px] flex-col bg-paper text-ink md:flex-row">
            <SidebarBody active={tab} content={baseline} />
            {tab === "series" && (
              <HomeBody cards={homeCards} content={baseline} />
            )}
            {tab === "about" && <AboutBody content={baseline} />}
            {tab === "contact" && <ContactBody content={baseline} />}
            {tab === "prints" && (
              <PrintsBody groups={printGroups} content={baseline} />
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
