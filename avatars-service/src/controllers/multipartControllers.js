import { httpError } from "../errors/httpErrors.js";

async function getMultipartFile(request) {
  if (!request.isMultipart()) {
    throw httpError("Request is not multipart/form-data", 406);
  }

  const file = await request.file();
  if (!file) {
    throw httpError("No file uploaded", 400);
  }

  return file;
}

async function ensureSingleFileUpload(request) {
  const parts = request.parts();
  let fileCount = 0;

  for await (const part of parts) {
    if (part.file) {
      fileCount++;
    } else {
      continue;
    }

    if (fileCount > 1) {
      throw httpError("Only one file allowed per request", 400);
    }
  }
}

export async function extractFile(request) {
  await ensureSingleFileUpload(request);
  return await getMultipartFile(request);
}
