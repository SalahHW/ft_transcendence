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

export async function verifyIdentity(request, reply) {
  const requestedUserId = request.params?.id;

  if (!requestedUserId) {
    return reply.code(400).send({ error: "User ID is required" });
  }

  try {
    await verifyAuthentication(request, reply);

    if (reply.sent) {
      return;
    }

    const authenticatedUserId = request.user.id;
    if (authenticatedUserId !== requestedUserId) {
      return reply
        .code(403)
        .send({
          error: "Access denied: You can only access your own resources",
        });
    }
  } catch (error) {
    return reply.code(500).send({ error: "Internal server error" });
  }
}
