export const signToken = async (request, reply) => {
  const { userId, username, aud } = request.body;

  if (!userId || !username || !aud) {
    reply.statuscode = 400;
    reply.send({
      error:
        "Invalid request: required fields (userId, username, aud) are missing",
    });
    return;
  }

  const payload = {
    sub: userId,
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
