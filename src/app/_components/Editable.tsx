"use client";

import { createContext, useContext, useState } from "react";

import { paragraphs } from "src/lib/content-keys";

/**
 * Inline-editing support for site copy. Public pages render these regions as
 * plain markup; inside the admin page editor an EditProvider makes them
 * contentEditable, so copy is edited in place on the real page layout while
 * the structure stays fixed.
 */

export type EditContextValue = {
  /** Text a region should show when it (re)mounts: pending draft, else saved value. */
  getInitial: (key: string, fallback: string) => string;
  /** Report the region's current text after an edit. */
  setDraft: (key: string, value: string) => void;
  /** Admin-facing label for the key, shown as a tooltip. */
  getLabel: (key: string) => string;
  /** Bumped on save/discard to remount regions with fresh values. */
  resetKey: number;
};

const EditContext = createContext<EditContextValue | null>(null);

export const EditProvider = EditContext.Provider;

function serializeSingleLine(el: HTMLElement): string {
  return el.innerText.replace(/\s*\n\s*/g, " ").trim();
}

function serializeParagraphs(el: HTMLElement): string {
  return el.innerText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** A single-line editable text region (headings, labels, addresses…). */
export function EditableText({
  k,
  value,
  as: Tag = "span",
  className,
}: {
  k: string;
  value: string;
  as?: React.ElementType;
  className?: string;
}) {
  const edit = useContext(EditContext);
  if (!edit) return <Tag className={className}>{value}</Tag>;
  return (
    <EditableRegion
      key={edit.resetKey}
      edit={edit}
      k={k}
      value={value}
      Tag={Tag}
      className={className}
      serialize={serializeSingleLine}
    />
  );
}

/**
 * A multi-paragraph editable region. Paragraphs are separated by blank lines
 * in the stored value; Enter starts a new paragraph while editing.
 * `renderParagraph` keeps the public page's per-paragraph markup.
 */
export function EditableParagraphs({
  k,
  value,
  className,
  renderParagraph,
}: {
  k: string;
  value: string;
  className?: string;
  renderParagraph: (text: string, index: number) => React.ReactNode;
}) {
  const edit = useContext(EditContext);
  if (!edit) return <>{paragraphs(value).map(renderParagraph)}</>;
  return (
    <EditableRegion
      key={edit.resetKey}
      edit={edit}
      k={k}
      value={value}
      Tag="div"
      className={className}
      serialize={serializeParagraphs}
      renderContent={(text) => paragraphs(text).map(renderParagraph)}
    />
  );
}

function EditableRegion({
  edit,
  k,
  value,
  Tag,
  className,
  serialize,
  renderContent,
}: {
  edit: EditContextValue;
  k: string;
  value: string;
  Tag: React.ElementType;
  className?: string;
  serialize: (el: HTMLElement) => string;
  renderContent?: (text: string) => React.ReactNode;
}) {
  // Freeze the rendered text at mount: React then never rewrites the DOM text
  // while the user types (which would move the caret). Edits live in the DOM
  // and are reported to the provider; resetKey remounts with fresh values.
  const [initial] = useState(() => edit.getInitial(k, value));

  return (
    <Tag
      className={`${className ?? ""} cms-editable`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      title={`Editing: ${edit.getLabel(k)}`}
      data-cms-key={k}
      onInput={(e: React.FormEvent<HTMLElement>) =>
        edit.setDraft(k, serialize(e.currentTarget))
      }
    >
      {renderContent ? renderContent(initial) : initial}
    </Tag>
  );
}
