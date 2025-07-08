export const signToken = async (request, reply) => {
  const { sub, username, aud } = request.body;

  if (!sub || !username || !aud)
    return reply.code(400).send({
      error:
        "Invalid request: required fields (sub, username, aud) are missing",
    });

  const payload = {
    sub,
    username,
    role: "user",
    aud,
    iss: "jwt-service",
  };

  try {
    const token = await reply.jwtSign(payload, { expiresIn: "5m" });
    return reply.code(200).send({ token });
  } catch (error) {
    console.error(error);
    return reply.code(500).send({
      error: "Failed to generate token",
      cause: error.message,
    });
  }
};
