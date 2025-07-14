export async function extractFile(request, reply) {
  let file = null;
  try {
    const parts = request.parts();
    let partCount = 0;

    for await (const part of parts) {
      partCount++;

      if (part.file) {
        if (file) {
          part.file.resume();
          part.file.destroy();
          return reply
            .code(400)
            .send({ error: "Only one file allowed per request" });
        }
        file = part;
        break;
      } else {
        await part.value;
      }
    }
  } catch (error) {
    return reply.code(500).send({ error: "Failed to process multipart data" });
  }

  if (!file) {
    return reply.code(400).send({ error: "No file uploaded" });
  }

  request.file = file;
}
