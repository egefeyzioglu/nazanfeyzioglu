/**
 * The site copy managed through the admin panel. Each entry maps a stable
 * `site_content` key to admin-facing labels and a default value, which is also
 * what public pages fall back to when the row is missing.
 *
 * Multi-paragraph fields (`multiline: true`) separate paragraphs with a blank
 * line.
 */

export type ContentField = {
  key: string;
  label: string;
  /** Which admin section the field is edited under. */
  group: "Home" | "About" | "Contact" | "Prints" | "Exhibitions" | "Sidebar";
  multiline?: boolean;
  default: string;
};

/** Shared print copy, editable from Admin → Pages → Prints. */
export const PRINT_COPY_FIELDS: ContentField[] = [
  {
    key: "prints.details.heading",
    label: "Print type",
    group: "Prints",
    default: "Fine Art Giclée Print",
  },
  {
    key: "prints.details.paperLabel",
    label: "Paper label",
    group: "Prints",
    default: "Paper:",
  },
  {
    key: "prints.details.paper",
    label: "Paper",
    group: "Prints",
    default: "Epson Hot Press Bright White",
  },
  {
    key: "prints.details.editionLabel",
    label: "Edition label",
    group: "Prints",
    default: "Edition:",
  },
  {
    key: "prints.details.edition",
    label: "Edition description",
    group: "Prints",
    default: "Limited Edition of 20",
  },
  {
    key: "prints.details.imageSizeLabel",
    label: "Image size label",
    group: "Prints",
    default: "Image Size:",
  },
  {
    key: "prints.details.paperSizeLabel",
    label: "Overall paper size label",
    group: "Prints",
    default: "Overall Paper Size:",
  },
  {
    key: "prints.details.unknownSize",
    label: "Unknown size text",
    group: "Prints",
    default: "To be confirmed",
  },
  {
    key: "prints.details.borderLabel",
    label: "Border label",
    group: "Prints",
    default: "White Border:",
  },
  {
    key: "prints.details.border",
    label: "Border description",
    group: "Prints",
    default: "2 in on all sides",
  },
  {
    key: "prints.details.signed",
    label: "Signature",
    group: "Prints",
    default: "Hand-signed by the artist",
  },
  {
    key: "prints.details.numbered",
    label: "Numbering",
    group: "Prints",
    default: "Individually numbered",
  },
  {
    key: "prints.details.certificate",
    label: "Authenticity",
    group: "Prints",
    default: "Certificate of Authenticity included",
  },
  {
    key: "prints.details.framing",
    label: "Framing",
    group: "Prints",
    default: "Unframed",
  },
  {
    key: "prints.details.sizeExplanation",
    label: "Size explanation",
    group: "Prints",
    default:
      "Image Size is the size of the printed artwork. Overall Paper Size includes the 2-inch white border on all sides.",
    multiline: true,
  },
  {
    key: "prints.modal.eyebrow",
    label: "Modal eyebrow",
    group: "Prints",
    default: "Fine art prints",
  },
  {
    key: "prints.modal.priceOnRequest",
    label: "Unknown price text",
    group: "Prints",
    default: "Price on request",
  },
  {
    key: "prints.modal.addToCart",
    label: "Purchase button",
    group: "Prints",
    default: "Add to cart",
  },
  {
    key: "prints.modal.checkoutNote",
    label: "Checkout note",
    group: "Prints",
    default: "Continue to secure checkout",
  },
  {
    key: "prints.modal.inquire",
    label: "Inquiry button",
    group: "Prints",
    default: "Inquire about this print",
  },
  {
    key: "prints.modal.viewDetails",
    label: "Details button",
    group: "Prints",
    default: "View details",
  },
  {
    key: "prints.modal.close",
    label: "Close button accessible label",
    group: "Prints",
    default: "Close print details",
  },
  {
    key: "prints.modal.soldOut",
    label: "Sold-out text",
    group: "Prints",
    default: "Sold out",
  },
  {
    key: "prints.confirmation.received",
    label: "Order preparation message",
    group: "Prints",
    default:
      "Your order has been received. Please allow 3–7 business days for your print to be prepared for shipping.",
    multiline: true,
  },
  {
    key: "prints.confirmation.shipping",
    label: "Shipping transit clarification",
    group: "Prints",
    default: "This preparation time does not include shipping transit time.",
    multiline: true,
  },
];

export const CONTENT_FIELDS: ContentField[] = [
  ...PRINT_COPY_FIELDS,
  {
    key: "home.eyebrow",
    label: "Home rail eyebrow",
    group: "Home",
    default: "Selected Series — 2023 / 2026",
  },
  {
    key: "about.heading",
    label: "Heading",
    group: "About",
    default: "Nazan Feyzioğlu",
  },
  {
    key: "about.lead",
    label: "Lead paragraph",
    group: "About",
    multiline: true,
    default:
      "Nazan Feyzioglu is a self-taught visual artist based in Toronto whose work explores the space between abstraction and figuration.",
  },
  {
    key: "about.body",
    label: "Biography (blank line between paragraphs)",
    group: "About",
    multiline: true,
    default: [
      "Her paintings begin with abstract forms that gradually come together to create figures, gestures, and relationships. While recognizable characters emerge, the narratives remain open-ended. Rather than telling a specific story, each work invites viewers to bring their own memories, emotions, and interpretations into the image.",
      "Feyzioglu's artistic journey began in 2015 through Mandala drawing and later evolved into Zentangle-based explorations of pattern, rhythm, and repetition. Over time, these elements became the foundation of her figurative language. Today, she works primarily with acrylic on panel, building compositions from simplified forms, layered color relationships, and carefully balanced visual structures.",
      "Themes of connection, shared presence, curiosity, and the subtle humor of everyday life run throughout her work. Her figures often function as visual metaphors rather than portraits, creating spaces where personal and collective experiences can coexist.",
      "Although her paintings appear playful at first glance, they frequently explore deeper emotional territories—memory, belonging, inner dialogue, and the ways people relate to one another. Feyzioglu is particularly interested in the point where abstraction becomes representation, and where representation dissolves back into feeling and imagination.",
      "Her work has been exhibited internationally, including ArtAnkara International Contemporary Art Fair, Brussels Art Fair, and exhibitions in Madrid. She continues to develop her practice through exhibitions and art fairs, creating paintings that balance structure and spontaneity, humor and reflection, abstraction and narrative possibility.",
    ].join("\n\n"),
  },
  {
    key: "about.medium",
    label: "Medium fact",
    group: "About",
    default: "Acrylic on panel",
  },
  {
    key: "about.basedIn",
    label: "Based-in fact",
    group: "About",
    default: "Toronto, Canada",
  },
  {
    key: "contact.heading",
    label: "Heading",
    group: "Contact",
    default: "For acquisitions, commissions & exhibitions.",
  },
  {
    key: "contact.email",
    label: "Email address",
    group: "Contact",
    default: "nazanfeyzioglu@yahoo.com",
  },
  {
    key: "contact.basedIn",
    label: "Based-in line",
    group: "Contact",
    default: "Toronto, Canada",
  },
  {
    key: "contact.enquiries",
    label: "Enquiries line",
    group: "Contact",
    default: "Commissions & enquiries",
  },
  {
    key: "contact.responseTime",
    label: "Enquiries response time",
    group: "Contact",
    default: "Replies within a few days",
  },
  {
    key: "contact.outro",
    label: "Closing paragraph",
    group: "Contact",
    multiline: true,
    default:
      "Tell me a little about the wall it's for, and I'll send availability, sizes and pricing — for originals, prints, or a new commission.",
  },
  {
    key: "prints.heading",
    label: "Heading",
    group: "Prints",
    default: "Signed limited-edition prints.",
  },
  {
    key: "prints.intro",
    label: "Intro paragraph",
    group: "Prints",
    multiline: true,
    default:
      "Archival giclée prints of selected paintings, grouped by series. Each is signed and numbered. Each print includes a Certificate of Authenticity and is supplied unframed.",
  },
  {
    key: "exhibitions.heading",
    label: "Heading",
    group: "Exhibitions",
    default: "Selected exhibitions & fairs",
  },
  {
    key: "nav.series",
    label: "Nav link — Series",
    group: "Sidebar",
    default: "Series",
  },
  {
    key: "nav.prints",
    label: "Nav link — Prints",
    group: "Sidebar",
    default: "Prints",
  },
  {
    key: "nav.about",
    label: "Nav link — About",
    group: "Sidebar",
    default: "About",
  },
  {
    key: "nav.exhibitions",
    label: "Nav link — Exhibitions",
    group: "Sidebar",
    default: "Exhibitions",
  },
  {
    key: "nav.contact",
    label: "Nav link — Contact",
    group: "Sidebar",
    default: "Contact",
  },
  {
    key: "sidebar.location",
    label: "Location line",
    group: "Sidebar",
    default: "Toronto, Canada",
  },
  {
    key: "sidebar.instagram",
    label: "Instagram handle (without @)",
    group: "Sidebar",
    default: "nazanfeyzioglu",
  },
];

export const CONTENT_DEFAULTS: Record<string, string> = Object.fromEntries(
  CONTENT_FIELDS.map((f) => [f.key, f.default]),
);

export const CONTENT_LABELS: Record<string, string> = Object.fromEntries(
  CONTENT_FIELDS.map((f) => [f.key, `${f.group} — ${f.label}`]),
);

/** Splits a multi-paragraph content value into paragraphs. */
export function paragraphs(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
