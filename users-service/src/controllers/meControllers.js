export async function getMe(request, reply) {
  const token = request.cookies?.token;
  if (!token) {
    return reply.code(401).send({ error: "Authentication token is missing" });
  }

  const verificationResult = await request.server.verifyToken(token);
  if (!verificationResult.valid) {
    return reply.code(401).send({ error: verificationResult.error });
  }

  return { user: verificationResult.decoded };
}

export async function verifyAuthentication(request, reply) {
  const token = request.cookies?.token;

  if (!token) {
    return reply.code(401).send({ error: "Authentication token is missing" });
  }

  const verificationResult = await request.server.verifyToken(token);
  if (!verificationResult.valid) {
    return reply.code(401).send({ error: verificationResult.error });
  }

  request.user = verificationResult.decoded;
}

export async function verifyUserIdentity(request, reply) {
  const token = request.cookies?.token;
  const requestedUserId = request.params?.id;

  if (!token) {
    return reply.code(401).send({ error: "Authentication token is missing" });
  }

  if (!requestedUserId) {
    return reply.code(400).send({ error: "User ID is required" });
  }

  const verificationResult = await request.server.verifyToken(token);
  if (!verificationResult.valid) {
    return reply.code(401).send({ error: verificationResult.error });
  }

  const authenticatedUserId = verificationResult.decoded.id;
  if (authenticatedUserId !== requestedUserId) {
    return reply
      .code(403)
      .send({ error: "Access denied: You can only access your own resources" });
  }

  request.user = verificationResult.decoded;
  return true;
}
