export type GalleryPiece = {
  src: string;
  title: string;
  year: string;
  medium: string;
  size: string;
  blurb: string;
  span: string;
  aspect: string;
  pushdown?: boolean;
};

export const galleryPieces: GalleryPiece[] = [
  {
    src: "/live-site-media/Complex_Bonds-1-scaled.jpg",
    title: "Complex Bonds",
    year: "2023",
    medium: "Mixed media on canvas",
    size: "110 × 140 cm",
    blurb:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce vehicula gravida ex in tempor. Mauris hendrerit malesuada tortor ut luctus.",
    span: "md:col-span-7",
    aspect: "aspect-[5/4]",
  },
  {
    src: "/live-site-media/Inside-my-mind-scaled.jpeg",
    title: "Inside My Mind",
    year: "2023",
    medium: "Ink and acrylic on canvas",
    size: "90 × 120 cm",
    blurb:
      "Integer felis dolor, ultricies ut augue a, pulvinar tempor odio. Donec dictum libero accumsan, pharetra nisl vel, mollis ante.",
    span: "md:col-span-5",
    aspect: "aspect-[4/5]",
    pushdown: true,
  },
  {
    src: "/live-site-media/Dark-Dream-scaled.jpg",
    title: "Dark Dream",
    year: "2023",
    medium: "Mixed media on canvas",
    size: "100 × 120 cm",
    blurb:
      "Aliquam erat volutpat. Sed eu lectus nec lacus ultricies vulputate. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices.",
    span: "md:col-span-5",
    aspect: "aspect-[5/4]",
  },
  {
    src: "/live-site-media/Fun-World-scaled.jpeg",
    title: "Fun World",
    year: "2023",
    medium: "Oil on canvas",
    size: "120 × 160 cm",
    blurb:
      "Curabitur eget nibh in metus aliquam pretium. Nullam pharetra, ipsum at posuere maximus, justo lectus accumsan velit.",
    span: "md:col-span-7",
    aspect: "aspect-[5/4]",
  },
  {
    src: "/live-site-media/Dream-1-scaled.jpeg",
    title: "Dream I",
    year: "2023",
    medium: "Pen and acrylic on paper",
    size: "60 × 80 cm",
    blurb:
      "Quisque orci velit, tempor id tristique ut, faucibus a magna. Suspendisse potenti. Praesent ultrices porta velit, vel mattis nibh.",
    span: "md:col-span-4",
    aspect: "aspect-[3/4]",
  },
  {
    src: "/live-site-media/Side-by-side.jpeg",
    title: "Side by Side",
    year: "2023",
    medium: "Ink on canvas",
    size: "75 × 100 cm",
    blurb:
      "Praesent vehicula, lorem ut viverra rhoncus, lectus nibh tincidunt risus, sed pharetra justo lacus quis sapien.",
    span: "md:col-span-4",
    aspect: "aspect-[3/4]",
    pushdown: true,
  },
  {
    src: "/live-site-media/Dream-2--scaled.jpeg",
    title: "Dream II",
    year: "2023",
    medium: "Pen and acrylic on paper",
    size: "60 × 80 cm",
    blurb:
      "Maecenas sagittis arcu eu velit dapibus, nec rutrum nibh sodales. Cras ut tempus dui, eu venenatis purus.",
    span: "md:col-span-4",
    aspect: "aspect-[3/4]",
  },
];
