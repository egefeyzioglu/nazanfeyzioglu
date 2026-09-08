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
  group:
    | "Home"
    | "About"
    | "Contact"
    | "Prints"
    | "Exhibitions"
    | "Sidebar"
    | "Shipping, Returns & Exchanges";
  multiline?: boolean;
  default: string;
};

export const CONTENT_FIELDS: ContentField[] = [
  {
    key: "shipping.heading",
    label: "Page heading",
    group: "Shipping, Returns & Exchanges",
    default: "Shipping, Returns & Exchanges",
  },
  {
    key: "shipping.shipping.heading",
    label: "Shipping heading",
    group: "Shipping, Returns & Exchanges",
    default: "Shipping",
  },
  {
    key: "shipping.shipping.intro",
    label: "Shipping introduction",
    group: "Shipping, Returns & Exchanges",
    default: "We currently ship within Canada only.",
  },
  {
    key: "shipping.originals.heading",
    label: "Original artworks heading",
    group: "Shipping, Returns & Exchanges",
    default: "Original Artworks",
  },
  {
    key: "shipping.originals.body",
    label: "Original artworks shipping",
    group: "Shipping, Returns & Exchanges",
    multiline: true,
    default: "Complimentary shipping is included within Canada.",
  },
  {
    key: "shipping.prints.heading",
    label: "Fine art prints heading",
    group: "Shipping, Returns & Exchanges",
    default: "Fine Art Prints",
  },
  {
    key: "shipping.prints.body",
    label: "Fine art prints shipping",
    group: "Shipping, Returns & Exchanges",
    multiline: true,
    default:
      "A flat shipping rate of CAD $30 applies to all fine art print orders within Canada.\n\nFine art prints are carefully packaged and shipped rolled for protection.\n\nPlease note that the preparation time shown on individual product pages is separate from the carrier's delivery time.\n\nInternational shipping is not available at this time.",
  },
  {
    key: "shipping.returns.heading",
    label: "Returns heading",
    group: "Shipping, Returns & Exchanges",
    default: "Returns & Exchanges",
  },
  {
    key: "shipping.returns.body",
    label: "Returns and exchanges",
    group: "Shipping, Returns & Exchanges",
    multiline: true,
    default:
      "All sales of original artworks and fine art prints are final.\n\nDue to the nature of original artwork and signed, limited-edition fine art prints, we do not accept returns or exchanges.\n\nPlease review all artwork details, dimensions and product information carefully before placing your order.",
  },
  {
    key: "shipping.damage.heading",
    label: "Damaged orders heading",
    group: "Shipping, Returns & Exchanges",
    default: "Damaged or Incorrect Orders",
  },
  {
    key: "shipping.damage.intro",
    label: "Damaged orders introduction",
    group: "Shipping, Returns & Exchanges",
    default:
      "If your order arrives damaged, or if you receive an incorrect item, please contact us within",
  },
  {
    key: "shipping.damage.deadline",
    label: "Reporting deadline",
    group: "Shipping, Returns & Exchanges",
    default: "3 days of delivery",
  },
  {
    key: "shipping.damage.instructions",
    label: "Photograph instructions",
    group: "Shipping, Returns & Exchanges",
    default: "Please include your order number and clear photographs of:",
  },
  {
    key: "shipping.damage.artwork",
    label: "Artwork photograph",
    group: "Shipping, Returns & Exchanges",
    default: "the artwork or print,",
  },
  {
    key: "shipping.damage.damage",
    label: "Damage photograph",
    group: "Shipping, Returns & Exchanges",
    default: "the damage,",
  },
  {
    key: "shipping.damage.packaging",
    label: "Packaging photograph",
    group: "Shipping, Returns & Exchanges",
    default: "the shipping packaging, and",
  },
  {
    key: "shipping.damage.label",
    label: "Shipping label photograph",
    group: "Shipping, Returns & Exchanges",
    default: "the shipping label.",
  },
  {
    key: "shipping.damage.body",
    label: "Resolution details",
    group: "Shipping, Returns & Exchanges",
    multiline: true,
    default:
      "Please keep the artwork and all original packaging until the issue has been resolved.\n\nOnce the information has been reviewed, we will work with you to determine the most appropriate solution. Depending on the circumstances, this may include a replacement, refund, or another suitable resolution.\n\nFor limited-edition prints, replacement is subject to availability within the edition. Original artworks are unique and cannot be replaced with an identical work.",
  },
  {
    key: "shipping.important.heading",
    label: "Important heading",
    group: "Shipping, Returns & Exchanges",
    default: "Important",
  },
  {
    key: "shipping.important.body",
    label: "Important information",
    group: "Shipping, Returns & Exchanges",
    multiline: true,
    default:
      "We are unable to offer refunds or exchanges for change of mind, incorrect size selection, or differences in colour appearance resulting from individual screen or display settings.",
  },
  {
    key: "nav.shipping",
    label: "Shipping policy link",
    group: "Sidebar",
    default: "Shipping, Returns & Exchanges",
  },
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
      "Archival giclée prints of selected paintings, grouped by series. Each is signed and numbered. Paper, sizes and pricing are being finalised.",
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
