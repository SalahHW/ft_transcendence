export function sendControllerError(reply, errorObj) {
  const code = errorObj.code || 500;
  const message = errorObj.message || "Internal server error";
  return reply.code(code).send({ error: message });
}
