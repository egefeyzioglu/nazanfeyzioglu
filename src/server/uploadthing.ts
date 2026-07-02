import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { getAdminStatus } from "src/server/auth";

const f = createUploadthing();

export const uploadRouter = {
  /** Artwork / cover images uploaded from the admin panel. */
  artworkImage: f({ image: { maxFileSize: "32MB", maxFileCount: 1 } })
    .middleware(async () => {
      const { userId, isAdmin } = await getAdminStatus();
      if (!userId || !isAdmin) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- UploadThingError is the documented rejection type
        throw new UploadThingError("Admin role required");
      }
      return { userId };
    })
    .onUploadComplete(({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
