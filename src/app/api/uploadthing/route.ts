import { createRouteHandler } from "uploadthing/next";

import { uploadRouter } from "src/server/uploadthing";

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
});
