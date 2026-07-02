import Image from "next/image";

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
  width,
  height,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Intrinsic pixel width of the source image (from the CMS). */
  width: number;
  /** Intrinsic pixel height of the source image (from the CMS). */
  height: number;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className="block h-auto w-full max-w-full"
    />
  );
}
