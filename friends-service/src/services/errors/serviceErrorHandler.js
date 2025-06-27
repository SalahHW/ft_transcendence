export function handleServiceError(err) {
  const code = err.code || err.cause?.code;

  if (err.name === "AbortError") {
    return { code: 504, message: "Request timed out" };
  }

  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return { code: 503, message: `Network error: ${code}` };
  }

  if (err.status === 404) {
    return { code: 404, message: err.message };
  }

  return { code: 500, message: "Internal server error" };
}
