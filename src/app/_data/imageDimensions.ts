/**
 * Intrinsic pixel dimensions for the artwork assets, so next/image can reserve
 * the correct aspect ratio and avoid layout shift while images load.
 */
export const imageDimensions: Record<string, { w: number; h: number }> = {
  "/design-assets/blue-peace.jpg": { w: 3440, h: 1980 },
  "/design-assets/carnival-1.jpg": { w: 5906, h: 3937 },
  "/design-assets/carnival-2.jpg": { w: 5906, h: 3937 },
  "/design-assets/creature-1.jpg": { w: 2454, h: 3329 },
  "/design-assets/creature-2.jpg": { w: 2167, h: 2932 },
  "/design-assets/creature-3.jpg": { w: 4724, h: 7087 },
  "/design-assets/family-1.jpg": { w: 3070, h: 2265 },
  "/design-assets/family-2.jpg": { w: 2925, h: 2328 },
  "/design-assets/family-4.jpg": { w: 3078, h: 2295 },
  "/design-assets/family.jpg": { w: 2870, h: 2140 },
  "/design-assets/fun-world.jpg": { w: 3564, h: 2371 },
  "/design-assets/inside-my-mind.jpg": { w: 763, h: 1024 },
  "/design-assets/observer-one.jpg": { w: 2008, h: 2686 },
  "/design-assets/observer-one-v2.jpg": { w: 2008, h: 2686 },
  "/design-assets/party-1.jpg": { w: 4762, h: 3476 },
  "/design-assets/party-2.jpg": { w: 4762, h: 3476 },
  "/design-assets/summer-joy.jpg": { w: 3616, h: 2412 },
  "/design-assets/the-dreamer.jpg": { w: 2372, h: 3593 },
  "/design-assets/the-watcher.jpg": { w: 2369, h: 3574 },
  "/design-assets/thoughts-2.jpg": { w: 4829, h: 8326 },
  "/design-assets/thoughts.jpg": { w: 2458, h: 3666 },
  "/design-assets/wavy-dream.jpg": { w: 2975, h: 2267 },
};
