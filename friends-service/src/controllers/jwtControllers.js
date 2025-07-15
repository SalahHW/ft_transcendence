import * as jwtServices from "../services/jwtServices.js";

export async function verifyAuthentication(request, reply) {
  const token = request.cookies?.accessToken;

  if (!token) {
    return reply.code(401).send({ error: "Authentication token is missing" });
  }

  let response;
  try {
    response = await jwtServices.verifyToken(token);
  } catch (err) {
    return reply.code(503).send({
      error: "Authentication service temporarily unavailable",
    });
  }

  if (!response.ok) {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    console.error("Invalid JSON response from JWT service:", err);
    return reply
      .code(502)
      .send({ error: "Invalid response from authentication service" });
  }

  if (!data.decoded) {
    return reply
      .code(502)
      .send({ error: "Invalid user data from authentication service" });
  }

  request.user = data.decoded;
}
