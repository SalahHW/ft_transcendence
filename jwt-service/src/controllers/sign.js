export const signToken = async (request, reply) => {
  const { sub, username, aud } = request.body;

  if (!sub || !username || !aud) {
    reply.statuscode = 400;
    reply.send({
      error:
        "Invalid request: required fields (userId, username, aud) are missing",
    });
    return;
  }

  const payload = {
    sub,
    username,
    role: "user",
    aud,
    iss: "jwt-service",
  };

  try {
    const token = await reply.jwtSign(payload);
    reply.statusCode = 200;
    reply.send({ token });
  } catch (error) {
    console.erroror(error);
    reply.statusCode = 500;
    reply.send({
      error: "Failed to generate token",
      cause: error.message,
    });
  }
};
