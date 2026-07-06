import { generateReactHelpers } from "@uploadthing/react";

import type { UploadRouter } from "src/server/uploadthing";

export const { useUploadThing } = generateReactHelpers<UploadRouter>();
