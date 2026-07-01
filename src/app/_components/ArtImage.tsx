import Image from "next/image";

import { imageDimensions } from "src/app/_data/imageDimensions";

/**
 * Renders an artwork image at its natural aspect ratio (width:100%, height:auto)
 * the way the design does, while still feeding next/image intrinsic dimensions
 * so the layout doesn't shift as it loads.
 */
export default function ArtImage({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const dim = imageDimensions[src] ?? { w: 1000, h: 1000 };
  return (
    <Image
      src={src}
      alt={alt}
      width={dim.w}
      height={dim.h}
      sizes={sizes}
      priority={priority}
      className="block h-auto w-full max-w-full"
    />
  );
}
