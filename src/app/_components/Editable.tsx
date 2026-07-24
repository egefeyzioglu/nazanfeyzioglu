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
  // textContent, not innerText: innerText reflects CSS text-transform (the
  // nav links and eyebrows render uppercase), which would clobber the
  // stored casing.
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function isSafeLink(href: string): boolean {
  return /^(https?:\/\/|mailto:)[^)\s]+$/i.test(href);
}

function escapeLiteralLinks(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("[", "&#91;")
    .replaceAll("]", "&#93;");
}

function unescapeLiteralLinks(text: string): string {
  return text
    .replaceAll("&#93;", "]")
    .replaceAll("&#91;", "[")
    .replaceAll("&amp;", "&");
}

function serializeInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeLiteralLinks(node.textContent ?? "");
  }
  if (!(node instanceof HTMLElement)) return "";
  if (node.tagName === "BR") return "\n";
  const text = [...node.childNodes].map(serializeInline).join("");
  if (node.tagName === "A") {
    const href = node.getAttribute("href") ?? "";
    return isSafeLink(href) ? `[${text}](${href})` : text;
  }
  return text;
}

function serializeRichSingleLine(el: HTMLElement): string {
  return serializeInline(el).replace(/\s+/g, " ").trim();
}

function serializeParagraphs(el: HTMLElement): string {
  return [...el.childNodes]
    .map((child) => serializeInline(child).trim())
    .filter(Boolean)
    .join("\n\n");
}

function renderLinks(value: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const pattern = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
  let lastIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index;
    const label = match[1] ?? "";
    const href = match[2] ?? "";
    if (!isSafeLink(href)) continue;
    parts.push(unescapeLiteralLinks(value.slice(lastIndex, index)));
    parts.push(
      <a
        key={`${index}-${href}`}
        href={href}
        target={/^mailto:/i.test(href) ? undefined : "_blank"}
        rel={/^mailto:/i.test(href) ? undefined : "noopener noreferrer"}
        className="hover-clay border-line border-b"
      >
        {unescapeLiteralLinks(label)}
      </a>,
    );
    lastIndex = index + match[0].length;
  }
  parts.push(unescapeLiteralLinks(value.slice(lastIndex)));
  return parts;
}

/** Applies a URL to the selection in a link-enabled editable region. */
export function addLinkToSelection(): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    window.alert("Select some editable text first, then choose Add link.");
    return false;
  }
  const range = selection.getRangeAt(0);
  const startElement =
    range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement;
  const endElement =
    range.endContainer instanceof HTMLElement
      ? range.endContainer
      : range.endContainer.parentElement;
  const region = startElement?.closest<HTMLElement>("[data-cms-links='true']");
  if (
    !startElement ||
    !region ||
    !endElement ||
    !region.contains(range.endContainer)
  ) {
    window.alert("Links can be added to selected body copy.");
    return false;
  }
  const topLevelBlock = (
    node: Node,
    offset: number,
    endBoundary = false,
  ): Node | null => {
    if (region.tagName !== "DIV") return region;
    if (node === region) {
      const index = endBoundary ? offset - 1 : offset;
      return index >= 0 ? (region.childNodes[index] ?? null) : null;
    }
    let current: Node | null = node;
    while (current?.parentNode && current.parentNode !== region) {
      current = current.parentNode;
    }
    return current?.parentNode === region ? current : null;
  };
  const startBlock = topLevelBlock(range.startContainer, range.startOffset);
  const endBlock = topLevelBlock(range.endContainer, range.endOffset, true);
  if (!startBlock || !endBlock || startBlock !== endBlock) {
    window.alert("A link cannot span more than one paragraph.");
    return false;
  }
  if (/[\[\]]/.test(selection.toString())) {
    window.alert("Link text cannot contain square brackets.");
    return false;
  }
  const enteredHref = window.prompt(
    "Link URL (include https://, http://, or mailto:)",
    "https://",
  );
  if (enteredHref === null) return false;
  const href = enteredHref.trim();
  if (!isSafeLink(href)) {
    window.alert("Enter a URL beginning with https://, http://, or mailto:.");
    return false;
  }

  const existingAnchor = startElement.closest<HTMLAnchorElement>("a");
  const endAnchor = endElement.closest<HTMLAnchorElement>("a");
  const intersectingAnchors = [...region.querySelectorAll("a")].filter(
    (anchor) => range.intersectsNode(anchor),
  );
  if (
    intersectingAnchors.length > 0 &&
    !(
      intersectingAnchors.length === 1 &&
      existingAnchor === intersectingAnchors[0] &&
      endAnchor === existingAnchor
    )
  ) {
    window.alert(
      "Select text within one existing link, or text that does not overlap a link.",
    );
    return false;
  }
  if (existingAnchor?.closest("[data-cms-links='true']") === region) {
    existingAnchor.href = href;
    existingAnchor.target = /^mailto:/i.test(href) ? "" : "_blank";
    existingAnchor.rel = /^mailto:/i.test(href) ? "" : "noopener noreferrer";
    selection.removeAllRanges();
    region.dispatchEvent(new InputEvent("input", { bubbles: true }));
    return true;
  }

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.target = /^mailto:/i.test(href) ? "" : "_blank";
  anchor.rel = /^mailto:/i.test(href) ? "" : "noopener noreferrer";
  anchor.className = "hover-clay border-line border-b";
  anchor.append(range.extractContents());
  range.insertNode(anchor);
  selection.removeAllRanges();
  region.dispatchEvent(new InputEvent("input", { bubbles: true }));
  return true;
}

/** A single-line editable text region (headings, labels, addresses…). */
export function EditableText({
  k,
  value,
  as: Tag = "span",
  className,
  allowLinks = false,
}: {
  k: string;
  value: string;
  as?: React.ElementType;
  className?: string;
  allowLinks?: boolean;
}) {
  const edit = useContext(EditContext);
  const content = allowLinks ? renderLinks(value) : value;
  if (!edit) return <Tag className={className}>{content}</Tag>;
  return (
    <EditableRegion
      key={edit.resetKey}
      edit={edit}
      k={k}
      value={value}
      Tag={Tag}
      className={className}
      serialize={allowLinks ? serializeRichSingleLine : serializeSingleLine}
      renderContent={allowLinks ? renderLinks : undefined}
      allowLinks={allowLinks}
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
  renderParagraph: (text: React.ReactNode, index: number) => React.ReactNode;
}) {
  const edit = useContext(EditContext);
  if (!edit) {
    return (
      <>
        {paragraphs(value).map((paragraph, index) =>
          renderParagraph(renderLinks(paragraph), index),
        )}
      </>
    );
  }
  return (
    <EditableRegion
      key={edit.resetKey}
      edit={edit}
      k={k}
      value={value}
      Tag="div"
      className={className}
      serialize={serializeParagraphs}
      renderContent={(text) =>
        paragraphs(text).map((paragraph, index) =>
          renderParagraph(renderLinks(paragraph), index),
        )
      }
      allowLinks
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
  allowLinks = false,
}: {
  edit: EditContextValue;
  k: string;
  value: string;
  Tag: React.ElementType;
  className?: string;
  serialize: (el: HTMLElement) => string;
  renderContent?: (text: string) => React.ReactNode;
  allowLinks?: boolean;
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
      data-cms-links={allowLinks}
      onInput={(e: React.FormEvent<HTMLElement>) =>
        edit.setDraft(k, serialize(e.currentTarget))
      }
    >
      {renderContent ? renderContent(initial) : initial}
    </Tag>
  );
}
