import { httpError } from "../errors/httpErrors.js";

export async function extractFile(request) {
  const parts = request.parts();
  let file = null;

  for await (const part of parts) {
    if (part.file) {
      if (file) {
        throw httpError("Only one file allowed per request", 400);
      }
      file = part;
    } else {
      continue;
    }
  }

  if (!file) {
    throw httpError("No file uploaded", 400);
  }

  return file;
}
